"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassesService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ClassesService = class ClassesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, filiereId, departmentId, year, cycleId, optionId, sortBy, sortOrder, } = query;
        const filters = [];
        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { classType: { contains: search, mode: 'insensitive' } },
                ],
            });
        }
        if (typeof year === 'number')
            filters.push({ year });
        if (filiereId)
            filters.push({ filiereId });
        if (departmentId)
            filters.push({ filiere: { is: { departmentId } } });
        if (cycleId)
            filters.push({ cycleId });
        if (optionId)
            filters.push({ optionId });
        const where = filters.length > 0 ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.academicClass.findMany({
                where,
                include: {
                    filiere: {
                        include: {
                            department: { select: { id: true, name: true } },
                        },
                    },
                    academicOption: { select: { id: true, name: true, code: true } },
                    cycle: { select: { id: true, name: true, code: true } },
                    _count: {
                        select: { students: true, teachers: true, cours: true },
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
                filiere: { include: { department: true } },
                academicOption: true,
                cycle: true,
                students: true,
                teachers: { include: { teacher: true } },
            },
        });
        if (!academicClass)
            throw new common_1.NotFoundException(`Class ${id} not found`);
        return academicClass;
    }
    async findCours(id) {
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!academicClass)
            throw new common_1.NotFoundException(`Class ${id} not found`);
        return this.prisma.coursClass.findMany({
            where: { classId: id },
            include: {
                cours: true,
                teacher: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { cours: { name: 'asc' } },
        });
    }
    async create(dto) {
        if (dto.filiereId)
            await this.ensureFiliereExists(dto.filiereId);
        if (dto.cycleId)
            await this.ensureCycleExists(dto.cycleId);
        if (dto.optionId)
            await this.ensureOptionExists(dto.optionId);
        await this.ensureClassIdentityAvailable(dto.name, dto.year);
        return this.prisma.academicClass.create({
            data: {
                name: dto.name,
                year: dto.year,
                classType: dto.classType ?? null,
                cycleId: dto.cycleId ?? null,
                optionId: dto.optionId ?? null,
                filiereId: dto.filiereId ?? null,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.academicClass.findUnique({
            where: { id },
            select: { id: true, name: true, year: true },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Class ${id} not found`);
        if (typeof dto.filiereId === 'number')
            await this.ensureFiliereExists(dto.filiereId);
        if (typeof dto.cycleId === 'number')
            await this.ensureCycleExists(dto.cycleId);
        if (typeof dto.optionId === 'number')
            await this.ensureOptionExists(dto.optionId);
        const nextName = dto.name ?? existing.name;
        const nextYear = dto.year ?? existing.year;
        await this.ensureClassIdentityAvailable(nextName, nextYear, id);
        return this.prisma.academicClass.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.year !== undefined ? { year: dto.year } : {}),
                ...(dto.classType !== undefined ? { classType: dto.classType ?? null } : {}),
                ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId ?? null } : {}),
                ...(dto.optionId !== undefined ? { optionId: dto.optionId ?? null } : {}),
                ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId ?? null } : {}),
            },
        });
    }
    async remove(id) {
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id },
            select: {
                id: true,
                _count: { select: { students: true, teachers: true } },
            },
        });
        if (!academicClass)
            throw new common_1.NotFoundException(`Class ${id} not found`);
        if (academicClass._count.students > 0 || academicClass._count.teachers > 0) {
            throw new common_1.BadRequestException('Class cannot be deleted while students or teachers are still attached');
        }
        return this.prisma.academicClass.delete({ where: { id } });
    }
    async ensureFiliereExists(id) {
        const f = await this.prisma.filiere.findUnique({ where: { id }, select: { id: true } });
        if (!f)
            throw new common_1.NotFoundException(`Filiere ${id} not found`);
    }
    async ensureCycleExists(id) {
        const c = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
        if (!c)
            throw new common_1.NotFoundException(`Cycle ${id} not found`);
    }
    async ensureOptionExists(id) {
        const o = await this.prisma.option.findUnique({ where: { id }, select: { id: true } });
        if (!o)
            throw new common_1.NotFoundException(`Option ${id} not found`);
    }
    async ensureClassIdentityAvailable(name, year, excludeId) {
        const existing = await this.prisma.academicClass.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                year,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException(`A class named "${name}" already exists for year ${year}`);
        }
    }
    async importFromBuffer(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
        let imported = 0;
        const errors = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const name = String(row['name'] ?? row['Nom'] ?? '').trim();
                const year = Number(row['year'] ?? row['Année'] ?? 0);
                if (!name || !year) {
                    errors.push(`Row ${i + 2}: name and year are required`);
                    continue;
                }
                await this.create({
                    name,
                    year,
                    filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
                    classType: row['classType'] ? String(row['classType']).trim() : undefined,
                });
                imported++;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Row ${i + 2}: ${message}`);
            }
        }
        return { imported, errors };
    }
};
exports.ClassesService = ClassesService;
exports.ClassesService = ClassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassesService);
//# sourceMappingURL=classes.service.js.map