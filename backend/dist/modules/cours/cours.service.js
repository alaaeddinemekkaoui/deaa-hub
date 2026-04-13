"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CoursService = class CoursService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, classId, sortBy, sortOrder } = query;
        const filters = [];
        if (search)
            filters.push({ name: { contains: search, mode: 'insensitive' } });
        if (classId)
            filters.push({ classes: { some: { classId } } });
        const where = filters.length
            ? { AND: filters }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.cours.findMany({
                where,
                include: {
                    elementModule: {
                        select: { id: true, name: true, type: true, volumeHoraire: true },
                    },
                    _count: { select: { classes: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.cours.count({ where }),
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }
    async findOne(id) {
        const cours = await this.prisma.cours.findUnique({
            where: { id },
            include: {
                elementModule: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        volumeHoraire: true,
                        module: { select: { id: true, name: true } },
                    },
                },
                classes: {
                    include: {
                        class: {
                            include: {
                                filiere: {
                                    include: { department: { select: { id: true, name: true } } },
                                },
                            },
                        },
                        teacher: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!cours)
            throw new common_1.NotFoundException(`Cours ${id} not found`);
        return cours;
    }
    async create(dto) {
        await this.ensureNameAvailable(dto.name);
        if (dto.elementModuleId)
            await this.ensureElementModuleAvailable(dto.elementModuleId);
        const cours = await this.prisma.cours.create({
            data: {
                name: dto.name,
                type: dto.type ?? 'CM',
                elementModuleId: dto.elementModuleId ?? null,
            },
        });
        if (dto.classId) {
            await this.ensureClassExists(dto.classId);
            await this.prisma.coursClass.create({
                data: {
                    coursId: cours.id,
                    classId: dto.classId,
                    teacherId: dto.teacherId ?? null,
                },
            });
        }
        return cours;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.name)
            await this.ensureNameAvailable(dto.name, id);
        if (dto.elementModuleId)
            await this.ensureElementModuleAvailable(dto.elementModuleId, id);
        return this.prisma.cours.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.type !== undefined ? { type: dto.type } : {}),
                ...(dto.elementModuleId !== undefined
                    ? { elementModuleId: dto.elementModuleId ?? null }
                    : {}),
            },
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        return this.prisma.cours.delete({ where: { id } });
    }
    async assignToClass(coursId, dto) {
        await this.ensureExists(coursId);
        await this.ensureClassExists(dto.classId);
        const teacherIds = Array.from(new Set(dto.teacherIds?.length
            ? dto.teacherIds
            : dto.teacherId
                ? [dto.teacherId]
                : []));
        for (const teacherId of teacherIds) {
            await this.ensureTeacherExists(teacherId);
        }
        if (teacherIds.length === 0) {
            const existingUnassigned = await this.prisma.coursClass.findFirst({
                where: { coursId, classId: dto.classId, teacherId: null },
            });
            if (existingUnassigned) {
                return this.prisma.coursClass.update({
                    where: { id: existingUnassigned.id },
                    data: { groupLabel: dto.groupLabel ?? null },
                    include: {
                        class: true,
                        teacher: { select: { id: true, firstName: true, lastName: true } },
                    },
                });
            }
            return this.prisma.coursClass.create({
                data: {
                    coursId,
                    classId: dto.classId,
                    teacherId: null,
                    groupLabel: dto.groupLabel ?? null,
                },
                include: {
                    class: true,
                    teacher: { select: { id: true, firstName: true, lastName: true } },
                },
            });
        }
        for (const teacherId of teacherIds) {
            const existing = await this.prisma.coursClass.findFirst({
                where: { coursId, classId: dto.classId, teacherId },
                select: { id: true },
            });
            if (!existing) {
                await this.prisma.coursClass.create({
                    data: {
                        coursId,
                        classId: dto.classId,
                        teacherId,
                        groupLabel: dto.groupLabel ?? null,
                    },
                });
            }
        }
        return this.prisma.coursClass.findMany({
            where: { coursId, classId: dto.classId },
            include: {
                class: true,
                teacher: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: [{ teacherId: 'asc' }, { id: 'asc' }],
        });
    }
    async removeFromClass(coursId, classId, teacherId) {
        const where = {
            coursId,
            classId,
            ...(teacherId ? { teacherId } : {}),
        };
        const existing = await this.prisma.coursClass.findFirst({
            where,
            select: { id: true },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Cours ${coursId} is not assigned to class ${classId}`);
        if (teacherId) {
            return this.prisma.coursClass.delete({ where: { id: existing.id } });
        }
        return this.prisma.coursClass.deleteMany({ where: { coursId, classId } });
    }
    async importFromClass(classId) {
        const cls = await this.prisma.academicClass.findUnique({
            where: { id: classId },
            select: { id: true, filiereId: true },
        });
        if (!cls)
            throw new common_1.NotFoundException(`Class ${classId} not found`);
        const elements = await this.prisma.elementModule.findMany({
            where: {
                OR: [
                    { classId },
                    ...(cls.filiereId ? [{ module: { filiereId: cls.filiereId } }] : []),
                ],
            },
            select: { id: true, name: true, cours: { select: { id: true } } },
        });
        let created = 0;
        let existing = 0;
        for (const el of elements) {
            let coursId;
            if (el.cours) {
                coursId = el.cours.id;
                existing++;
            }
            else {
                let cours = await this.prisma.cours.findFirst({
                    where: { name: { equals: el.name, mode: 'insensitive' } },
                    select: { id: true, elementModuleId: true },
                });
                if (!cours) {
                    cours = await this.prisma.cours.create({
                        data: { name: el.name, elementModuleId: el.id },
                    });
                    created++;
                }
                else {
                    if (!cours.elementModuleId) {
                        await this.prisma.cours.update({
                            where: { id: cours.id },
                            data: { elementModuleId: el.id },
                        });
                    }
                    existing++;
                }
                coursId = cours.id;
            }
            const existingClassAssignment = await this.prisma.coursClass.findFirst({
                where: { coursId, classId, teacherId: null },
                select: { id: true },
            });
            if (!existingClassAssignment) {
                await this.prisma.coursClass.create({
                    data: { coursId, classId, teacherId: null },
                });
            }
        }
        return { created, existing, total: elements.length };
    }
    async ensureExists(id) {
        const cours = await this.prisma.cours.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!cours)
            throw new common_1.NotFoundException(`Cours ${id} not found`);
    }
    async ensureNameAvailable(name, excludeId) {
        const existing = await this.prisma.cours.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (existing)
            throw new common_1.ConflictException(`A cours named "${name}" already exists`);
    }
    async ensureElementModuleAvailable(elementModuleId, excludeCoursId) {
        const el = await this.prisma.elementModule.findUnique({
            where: { id: elementModuleId },
            select: { id: true },
        });
        if (!el)
            throw new common_1.NotFoundException(`ElementModule ${elementModuleId} not found`);
        const linked = await this.prisma.cours.findFirst({
            where: {
                elementModuleId,
                ...(excludeCoursId ? { id: { not: excludeCoursId } } : {}),
            },
            select: { id: true },
        });
        if (linked)
            throw new common_1.ConflictException(`ElementModule ${elementModuleId} already has a linked cours`);
    }
    async ensureClassExists(classId) {
        const cls = await this.prisma.academicClass.findUnique({
            where: { id: classId },
            select: { id: true },
        });
        if (!cls)
            throw new common_1.NotFoundException(`Class ${classId} not found`);
    }
    async ensureTeacherExists(teacherId) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
            select: { id: true },
        });
        if (!teacher)
            throw new common_1.NotFoundException(`Teacher ${teacherId} not found`);
    }
};
exports.CoursService = CoursService;
exports.CoursService = CoursService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CoursService);
//# sourceMappingURL=cours.service.js.map