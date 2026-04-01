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
exports.CyclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CyclesService = class CyclesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.cycle.findMany({
            include: { _count: { select: { classes: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        const cycle = await this.prisma.cycle.findUnique({
            where: { id },
            include: { _count: { select: { classes: true } } },
        });
        if (!cycle)
            throw new common_1.NotFoundException(`Cycle ${id} not found`);
        return cycle;
    }
    async create(dto) {
        await this.ensureNameAvailable(dto.name);
        return this.prisma.cycle.create({ data: { name: dto.name, code: dto.code ?? null } });
    }
    async update(id, dto) {
        const existing = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
        if (!existing)
            throw new common_1.NotFoundException(`Cycle ${id} not found`);
        if (dto.name)
            await this.ensureNameAvailable(dto.name, id);
        return this.prisma.cycle.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
            },
        });
    }
    async remove(id) {
        const cycle = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
        if (!cycle)
            throw new common_1.NotFoundException(`Cycle ${id} not found`);
        return this.prisma.cycle.delete({ where: { id } });
    }
    async ensureNameAvailable(name, excludeId) {
        const ex = await this.prisma.cycle.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
            select: { id: true },
        });
        if (ex)
            throw new common_1.ConflictException(`Cycle "${name}" already exists`);
    }
};
exports.CyclesService = CyclesService;
exports.CyclesService = CyclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CyclesService);
//# sourceMappingURL=cycles.service.js.map