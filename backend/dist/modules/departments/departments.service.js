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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
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
    async importFromBuffer(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            defval: null,
        });
        let imported = 0;
        const errors = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const name = String(row['name'] ?? row['Nom'] ?? '').trim();
                if (!name) {
                    errors.push(`Row ${i + 2}: name is required`);
                    continue;
                }
                await this.create({ name });
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
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map