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
exports.OptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let OptionsService = class OptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, filiereId, departmentId, sortBy, sortOrder } = query;
        const filters = [];
        if (search)
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                ],
            });
        if (filiereId)
            filters.push({ filiereId });
        if (departmentId)
            filters.push({ filiere: { is: { departmentId } } });
        const where = filters.length
            ? { AND: filters }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.option.findMany({
                where,
                include: {
                    filiere: {
                        include: { department: { select: { id: true, name: true } } },
                    },
                    _count: { select: { classes: true, modules: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.option.count({ where }),
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
        const opt = await this.prisma.option.findUnique({
            where: { id },
            include: {
                filiere: { include: { department: true } },
                modules: { include: { _count: { select: { elements: true } } } },
                _count: { select: { classes: true, modules: true } },
            },
        });
        if (!opt)
            throw new common_1.NotFoundException(`Option ${id} not found`);
        return opt;
    }
    async create(dto) {
        await this.ensureFiliereExists(dto.filiereId);
        await this.ensureNameAvailable(dto.name, dto.filiereId);
        return this.prisma.option.create({
            data: {
                name: dto.name,
                code: dto.code ?? null,
                filiereId: dto.filiereId,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.option.findUnique({
            where: { id },
            select: { id: true, name: true, filiereId: true },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Option ${id} not found`);
        const nextFiliereId = dto.filiereId ?? existing.filiereId;
        if (dto.filiereId)
            await this.ensureFiliereExists(dto.filiereId);
        if (dto.name)
            await this.ensureNameAvailable(dto.name, nextFiliereId, id);
        return this.prisma.option.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
                ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId } : {}),
            },
        });
    }
    async remove(id) {
        const opt = await this.prisma.option.findUnique({
            where: { id },
            select: {
                id: true,
                _count: { select: { classes: true, modules: true } },
            },
        });
        if (!opt)
            throw new common_1.NotFoundException(`Option ${id} not found`);
        return this.prisma.option.delete({ where: { id } });
    }
    async ensureFiliereExists(id) {
        const f = await this.prisma.filiere.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!f)
            throw new common_1.NotFoundException(`Filiere ${id} not found`);
    }
    async ensureNameAvailable(name, filiereId, excludeId) {
        const ex = await this.prisma.option.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                filiereId,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (ex)
            throw new common_1.ConflictException(`Option "${name}" already exists in this filière`);
    }
};
exports.OptionsService = OptionsService;
exports.OptionsService = OptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OptionsService);
//# sourceMappingURL=options.service.js.map