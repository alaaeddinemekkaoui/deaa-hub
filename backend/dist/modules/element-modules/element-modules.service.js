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
exports.ElementModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const academic_modules_service_1 = require("../academic-modules/academic-modules.service");
let ElementModulesService = class ElementModulesService {
    prisma;
    modulesService;
    constructor(prisma, modulesService) {
        this.prisma = prisma;
        this.modulesService = modulesService;
    }
    async findAll(query) {
        const { page, limit, search, moduleId, classId, type, sortBy, sortOrder } = query;
        const filters = [];
        if (search)
            filters.push({ name: { contains: search, mode: 'insensitive' } });
        if (moduleId)
            filters.push({ moduleId });
        if (classId)
            filters.push({ classId });
        if (type)
            filters.push({ type: type });
        const where = filters.length
            ? { AND: filters }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.elementModule.findMany({
                where,
                include: {
                    module: {
                        include: {
                            filiere: { select: { id: true, name: true } },
                            option: { select: { id: true, name: true } },
                            classes: {
                                include: {
                                    class: { select: { id: true, name: true, year: true } },
                                },
                            },
                        },
                    },
                    class: { select: { id: true, name: true, year: true } },
                    _count: { select: { sessions: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.elementModule.count({ where }),
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
        const el = await this.prisma.elementModule.findUnique({
            where: { id },
            include: {
                module: {
                    include: {
                        filiere: true,
                        option: true,
                        classes: {
                            include: {
                                class: { select: { id: true, name: true, year: true } },
                            },
                        },
                    },
                },
                class: { select: { id: true, name: true, year: true } },
                sessions: {
                    include: {
                        class: true,
                        teacher: { select: { id: true, firstName: true, lastName: true } },
                        room: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!el)
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
        return el;
    }
    async create(dto) {
        await this.ensureModuleExists(dto.moduleId);
        const element = await this.prisma.elementModule.create({
            data: {
                name: dto.name,
                moduleId: dto.moduleId,
                volumeHoraire: dto.volumeHoraire ?? null,
                type: dto.type ?? 'CM',
                classId: null,
            },
            select: { id: true, name: true, cours: { select: { id: true } } },
        });
        const moduleClasses = await this.prisma.moduleClass.findMany({
            where: { moduleId: dto.moduleId },
            select: { classId: true },
        });
        for (const { classId } of moduleClasses) {
            await this.modulesService.ensureCoursAndCoursClass(element, classId);
        }
        return this.prisma.elementModule.findUnique({
            where: { id: element.id },
            include: {
                module: {
                    include: {
                        classes: {
                            include: {
                                class: { select: { id: true, name: true, year: true } },
                            },
                        },
                    },
                },
                _count: { select: { sessions: true } },
            },
        });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.moduleId)
            await this.ensureModuleExists(dto.moduleId);
        return this.prisma.elementModule.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
                ...(dto.volumeHoraire !== undefined
                    ? { volumeHoraire: dto.volumeHoraire ?? null }
                    : {}),
                ...(dto.type !== undefined ? { type: dto.type } : {}),
            },
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        return this.prisma.elementModule.delete({ where: { id } });
    }
    async ensureExists(id) {
        const e = await this.prisma.elementModule.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!e)
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
    }
    async ensureModuleExists(id) {
        const m = await this.prisma.module.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!m)
            throw new common_1.NotFoundException(`Module ${id} not found`);
    }
};
exports.ElementModulesService = ElementModulesService;
exports.ElementModulesService = ElementModulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        academic_modules_service_1.AcademicModulesService])
], ElementModulesService);
//# sourceMappingURL=element-modules.service.js.map