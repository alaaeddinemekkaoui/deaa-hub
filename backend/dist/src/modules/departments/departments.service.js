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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DepartmentsService = class DepartmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, sortBy, sortOrder } = query;
        const where = search
            ? {
                name: {
                    contains: search,
                    mode: 'insensitive',
                },
            }
            : undefined;
        const [data, total] = await Promise.all([
            this.prisma.department.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            filieres: true,
                            teachers: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.department.count({ where }),
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
        const department = await this.prisma.department.findUnique({
            where: { id },
            include: {
                filieres: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        _count: {
                            select: {
                                classes: true,
                                students: true,
                            },
                        },
                    },
                    orderBy: { name: 'asc' },
                },
                _count: {
                    select: {
                        filieres: true,
                        teachers: true,
                    },
                },
            },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        return department;
    }
    async create(dto) {
        await this.ensureNameAvailable(dto.name);
        return this.prisma.department.create({ data: dto });
    }
    async update(id, dto) {
        await this.ensureDepartmentExists(id);
        if (dto.name) {
            await this.ensureNameAvailable(dto.name, id);
        }
        return this.prisma.department.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const department = await this.prisma.department.findUnique({
            where: { id },
            select: {
                id: true,
                _count: {
                    select: {
                        filieres: true,
                        teachers: true,
                    },
                },
            },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        if (department._count.filieres > 0 || department._count.teachers > 0) {
            throw new common_1.BadRequestException('Department cannot be deleted while filieres or teachers are still attached');
        }
        return this.prisma.department.delete({ where: { id } });
    }
    async ensureDepartmentExists(id) {
        const department = await this.prisma.department.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
    }
    async ensureNameAvailable(name, excludeId) {
        const existing = await this.prisma.department.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException(`Department "${name}" already exists`);
        }
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map