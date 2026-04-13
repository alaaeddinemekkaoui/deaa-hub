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
exports.AcademicModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AcademicModulesService = class AcademicModulesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, filiereId, optionId, sortBy, sortOrder } = query;
        const filters = [];
        if (search)
            filters.push({ name: { contains: search, mode: 'insensitive' } });
        if (filiereId)
            filters.push({ filiereId });
        if (optionId)
            filters.push({ optionId });
        const where = filters.length
            ? { AND: filters }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.module.findMany({
                where,
                include: {
                    filiere: { select: { id: true, name: true } },
                    option: { select: { id: true, name: true } },
                    classes: {
                        include: {
                            class: { select: { id: true, name: true, year: true } },
                        },
                    },
                    _count: { select: { elements: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.module.count({ where }),
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
        const mod = await this.prisma.module.findUnique({
            where: { id },
            include: {
                filiere: { select: { id: true, name: true } },
                option: { select: { id: true, name: true } },
                classes: {
                    include: {
                        class: {
                            select: {
                                id: true,
                                name: true,
                                year: true,
                                filiereId: true,
                                optionId: true,
                            },
                        },
                    },
                },
                elements: { orderBy: { name: 'asc' } },
            },
        });
        if (!mod)
            throw new common_1.NotFoundException(`Module ${id} not found`);
        return mod;
    }
    async create(dto) {
        if (dto.filiereId)
            await this.ensureFiliereExists(dto.filiereId);
        if (dto.optionId)
            await this.ensureOptionExists(dto.optionId);
        for (const classId of dto.classIds) {
            await this.ensureClassExists(classId);
        }
        const mod = await this.prisma.module.create({
            data: {
                name: dto.name,
                semestre: dto.semestre ?? null,
                filiereId: dto.filiereId ?? null,
                optionId: dto.optionId ?? null,
                classes: {
                    create: dto.classIds.map((classId) => ({ classId })),
                },
            },
            include: {
                classes: {
                    include: { class: { select: { id: true, name: true, year: true } } },
                },
                _count: { select: { elements: true } },
            },
        });
        return mod;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.filiereId)
            await this.ensureFiliereExists(dto.filiereId);
        if (dto.optionId)
            await this.ensureOptionExists(dto.optionId);
        return this.prisma.module.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.semestre !== undefined
                    ? { semestre: dto.semestre ?? null }
                    : {}),
                ...(dto.filiereId !== undefined
                    ? { filiereId: dto.filiereId ?? null }
                    : {}),
                ...(dto.optionId !== undefined
                    ? { optionId: dto.optionId ?? null }
                    : {}),
            },
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        return this.prisma.module.delete({ where: { id } });
    }
    async assignClass(moduleId, classId) {
        await this.ensureExists(moduleId);
        await this.ensureClassExists(classId);
        const existing = await this.prisma.moduleClass.findUnique({
            where: { moduleId_classId: { moduleId, classId } },
        });
        if (!existing) {
            await this.prisma.moduleClass.create({ data: { moduleId, classId } });
        }
        const elements = await this.prisma.elementModule.findMany({
            where: { moduleId },
            select: { id: true, name: true, cours: { select: { id: true } } },
        });
        for (const el of elements) {
            await this.ensureCoursAndCoursClass(el, classId);
        }
        return this.prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                classes: {
                    include: { class: { select: { id: true, name: true, year: true } } },
                },
            },
        });
    }
    async removeClass(moduleId, classId) {
        await this.ensureExists(moduleId);
        const existing = await this.prisma.moduleClass.findUnique({
            where: { moduleId_classId: { moduleId, classId } },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Class ${classId} is not assigned to module ${moduleId}`);
        await this.prisma.moduleClass.delete({
            where: { moduleId_classId: { moduleId, classId } },
        });
        return { success: true };
    }
    async ensureCoursAndCoursClass(el, classId) {
        let coursId;
        if (el.cours) {
            coursId = el.cours.id;
        }
        else {
            const existing = await this.prisma.cours.findFirst({
                where: { name: { equals: el.name, mode: 'insensitive' } },
                select: { id: true, elementModuleId: true },
            });
            if (existing) {
                if (!existing.elementModuleId) {
                    await this.prisma.cours.update({
                        where: { id: existing.id },
                        data: { elementModuleId: el.id },
                    });
                }
                coursId = existing.id;
            }
            else {
                let coursName = el.name;
                const conflict = await this.prisma.cours.findFirst({
                    where: {
                        name: { equals: coursName, mode: 'insensitive' },
                        elementModuleId: { not: null },
                    },
                });
                if (conflict)
                    coursName = `${el.name} (${el.id})`;
                const created = await this.prisma.cours.create({
                    data: { name: coursName, elementModuleId: el.id },
                });
                coursId = created.id;
            }
        }
        const existingCC = await this.prisma.coursClass.findFirst({
            where: { coursId, classId, teacherId: null },
        });
        if (!existingCC) {
            await this.prisma.coursClass.create({
                data: { coursId, classId, teacherId: null },
            });
        }
    }
    async ensureExists(id) {
        const m = await this.prisma.module.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!m)
            throw new common_1.NotFoundException(`Module ${id} not found`);
    }
    async ensureFiliereExists(id) {
        const f = await this.prisma.filiere.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!f)
            throw new common_1.NotFoundException(`Filiere ${id} not found`);
    }
    async ensureOptionExists(id) {
        const o = await this.prisma.option.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!o)
            throw new common_1.NotFoundException(`Option ${id} not found`);
    }
    async ensureClassExists(id) {
        const c = await this.prisma.academicClass.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!c)
            throw new common_1.NotFoundException(`Class ${id} not found`);
    }
};
exports.AcademicModulesService = AcademicModulesService;
exports.AcademicModulesService = AcademicModulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AcademicModulesService);
//# sourceMappingURL=academic-modules.service.js.map