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
exports.ClassesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ClassesService = class ClassesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, filiereId, departmentId, year, sortBy, sortOrder, } = query;
        const filters = [];
        if (search) {
            filters.push({
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        classType: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                ],
            });
        }
        if (typeof year === 'number') {
            filters.push({ year });
        }
        if (filiereId) {
            filters.push({ filiereId });
        }
        if (departmentId) {
            filters.push({ filiere: { is: { departmentId } } });
        }
        const where = filters.length > 0 ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.academicClass.findMany({
                where,
                include: {
                    filiere: {
                        include: {
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            students: true,
                            teachers: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: sortBy === 'year'
                    ? [{ year: sortOrder }, { name: 'asc' }]
                    : [{ [sortBy]: sortOrder }, { year: 'asc' }, { name: 'asc' }],
            }),
            this.prisma.academicClass.count({ where }),
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
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id },
            include: {
                filiere: {
                    include: {
                        department: true,
                    },
                },
                students: true,
                teachers: {
                    include: {
                        teacher: true,
                    },
                },
            },
        });
        if (!academicClass) {
            throw new common_1.NotFoundException(`Class ${id} not found`);
        }
        return academicClass;
    }
    async create(dto) {
        if (dto.filiereId) {
            await this.ensureFiliereExists(dto.filiereId);
        }
        await this.ensureClassIdentityAvailable(dto.name, dto.year);
        return this.prisma.academicClass.create({
            data: {
                name: dto.name,
                year: dto.year,
                classType: dto.classType ?? null,
                filiereId: dto.filiereId ?? null,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.academicClass.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                year: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Class ${id} not found`);
        }
        if (typeof dto.filiereId === 'number') {
            await this.ensureFiliereExists(dto.filiereId);
        }
        const nextName = dto.name ?? existing.name;
        const nextYear = dto.year ?? existing.year;
        await this.ensureClassIdentityAvailable(nextName, nextYear, id);
        return this.prisma.academicClass.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.year !== undefined ? { year: dto.year } : {}),
                ...(dto.classType !== undefined
                    ? { classType: dto.classType ?? null }
                    : {}),
                ...(dto.filiereId !== undefined
                    ? { filiereId: dto.filiereId ?? null }
                    : {}),
            },
        });
    }
    async remove(id) {
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id },
            select: {
                id: true,
                _count: {
                    select: {
                        students: true,
                        teachers: true,
                    },
                },
            },
        });
        if (!academicClass) {
            throw new common_1.NotFoundException(`Class ${id} not found`);
        }
        if (academicClass._count.students > 0 ||
            academicClass._count.teachers > 0) {
            throw new common_1.BadRequestException('Class cannot be deleted while students or teachers are still attached');
        }
        return this.prisma.academicClass.delete({ where: { id } });
    }
    async ensureFiliereExists(id) {
        const filiere = await this.prisma.filiere.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!filiere) {
            throw new common_1.NotFoundException(`Filiere ${id} not found`);
        }
    }
    async ensureClassIdentityAvailable(name, year, excludeId) {
        const existing = await this.prisma.academicClass.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
                year,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException(`A class named "${name}" already exists for year ${year}`);
        }
    }
};
exports.ClassesService = ClassesService;
exports.ClassesService = ClassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassesService);
//# sourceMappingURL=classes.service.js.map