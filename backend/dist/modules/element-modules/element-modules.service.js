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
let ElementModulesService = class ElementModulesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        const where = filters.length ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.elementModule.findMany({
                where,
                include: {
                    module: { include: { filiere: { select: { id: true, name: true } }, option: { select: { id: true, name: true } } } },
                    class: { select: { id: true, name: true, year: true } },
                    _count: { select: { sessions: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.elementModule.count({ where }),
        ]);
        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
    }
    async findOne(id) {
        const el = await this.prisma.elementModule.findUnique({
            where: { id },
            include: {
                module: { include: { filiere: true, option: true } },
                class: { select: { id: true, name: true, year: true } },
                sessions: { include: { class: true, teacher: { select: { id: true, firstName: true, lastName: true } }, room: { select: { id: true, name: true } } } },
            },
        });
        if (!el)
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
        return el;
    }
    async create(dto) {
        await this.ensureModuleExists(dto.moduleId);
        if (dto.classId)
            await this.ensureClassExists(dto.classId);
        const element = await this.prisma.elementModule.create({
            data: { name: dto.name, moduleId: dto.moduleId, volumeHoraire: dto.volumeHoraire ?? null, type: dto.type ?? 'CM', classId: dto.classId ?? null },
        });
        const existingCours = await this.prisma.cours.findFirst({
            where: { name: { equals: dto.name, mode: 'insensitive' } },
            select: { id: true, elementModuleId: true },
        });
        if (existingCours) {
            if (!existingCours.elementModuleId) {
                await this.prisma.cours.update({
                    where: { id: existingCours.id },
                    data: { elementModuleId: element.id },
                });
            }
            if (dto.classId) {
                const existingClassAssignment = await this.prisma.coursClass.findFirst({
                    where: {
                        coursId: existingCours.id,
                        classId: dto.classId,
                        teacherId: null,
                    },
                    select: { id: true },
                });
                if (!existingClassAssignment) {
                    await this.prisma.coursClass.create({
                        data: { coursId: existingCours.id, classId: dto.classId, teacherId: null },
                    });
                }
            }
        }
        else {
            const cours = await this.prisma.cours.create({
                data: { name: dto.name, elementModuleId: element.id },
            });
            if (dto.classId) {
                await this.prisma.coursClass.create({
                    data: { coursId: cours.id, classId: dto.classId },
                });
            }
        }
        return element;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.moduleId)
            await this.ensureModuleExists(dto.moduleId);
        if (dto.classId)
            await this.ensureClassExists(dto.classId);
        return this.prisma.elementModule.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
                ...(dto.volumeHoraire !== undefined ? { volumeHoraire: dto.volumeHoraire ?? null } : {}),
                ...(dto.type !== undefined ? { type: dto.type } : {}),
                ...(dto.classId !== undefined ? { classId: dto.classId ?? null } : {}),
            },
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        return this.prisma.elementModule.delete({ where: { id } });
    }
    async ensureExists(id) {
        const e = await this.prisma.elementModule.findUnique({ where: { id }, select: { id: true } });
        if (!e)
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
    }
    async ensureModuleExists(id) {
        const m = await this.prisma.module.findUnique({ where: { id }, select: { id: true } });
        if (!m)
            throw new common_1.NotFoundException(`Module ${id} not found`);
    }
    async ensureClassExists(id) {
        const c = await this.prisma.academicClass.findUnique({ where: { id }, select: { id: true } });
        if (!c)
            throw new common_1.NotFoundException(`Class ${id} not found`);
    }
};
exports.ElementModulesService = ElementModulesService;
exports.ElementModulesService = ElementModulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ElementModulesService);
//# sourceMappingURL=element-modules.service.js.map