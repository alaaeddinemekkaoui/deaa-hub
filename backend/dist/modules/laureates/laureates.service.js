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
exports.LaureatesService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
let LaureatesService = class LaureatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.laureate.findMany({
            include: {
                student: {
                    include: { filiere: true },
                },
                proofDocument: true,
            },
            orderBy: { graduationYear: 'desc' },
        });
    }
    findOne(id) {
        return this.prisma.laureate.findUnique({
            where: { id },
            include: {
                student: { include: { filiere: true } },
                proofDocument: true,
            },
        });
    }
    async findNonLaureateStudents(search) {
        const laureateStudentIds = await this.prisma.laureate
            .findMany({ select: { studentId: true } })
            .then((rows) => rows.map((r) => r.studentId));
        return this.prisma.student.findMany({
            where: {
                id: { notIn: laureateStudentIds.length ? laureateStudentIds : [-1] },
                ...(search
                    ? {
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' } },
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { codeMassar: { contains: search, mode: 'insensitive' } },
                            { cin: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                fullName: true,
                codeMassar: true,
                filiere: { select: { name: true } },
                academicClass: { select: { name: true } },
            },
            orderBy: { fullName: 'asc' },
            take: 100,
        });
    }
    async create(dto, userId) {
        const existing = await this.prisma.laureate.findUnique({
            where: { studentId: dto.studentId },
        });
        if (existing) {
            throw new common_1.ConflictException(`Student ${dto.studentId} is already a laureate`);
        }
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
            select: { id: true, fullName: true },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student ${dto.studentId} not found`);
        }
        const laureate = await this.prisma.laureate.create({
            data: {
                studentId: dto.studentId,
                graduationYear: dto.graduationYear,
                diplomaStatus: dto.diplomaStatus ?? 'not_retrieved',
                proofDocumentId: dto.proofDocumentId ?? null,
            },
        });
        if (userId) {
            await this.log(userId, `Added laureate: ${student.fullName} (${dto.graduationYear})`, {
                laureateId: laureate.id,
                studentId: dto.studentId,
                studentName: student.fullName,
                graduationYear: dto.graduationYear,
                diplomaStatus: laureate.diplomaStatus,
            });
        }
        return laureate;
    }
    async update(id, dto, userId) {
        const existing = await this.prisma.laureate.findUnique({
            where: { id },
            include: { student: { select: { fullName: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Laureate ${id} not found`);
        const updated = await this.prisma.laureate.update({
            where: { id },
            data: dto,
        });
        if (userId) {
            await this.log(userId, `Updated laureate: ${existing.student.fullName}`, {
                laureateId: id,
                changes: dto,
            });
        }
        return updated;
    }
    async remove(id, userId) {
        const existing = await this.prisma.laureate.findUnique({
            where: { id },
            include: { student: { select: { fullName: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Laureate ${id} not found`);
        const deleted = await this.prisma.laureate.delete({ where: { id } });
        if (userId) {
            await this.log(userId, `Removed laureate: ${existing.student.fullName}`, {
                laureateId: id,
                studentName: existing.student.fullName,
            });
        }
        return deleted;
    }
    async importFromBuffer(buffer, userId) {
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
                const studentId = Number(row['studentId'] ?? 0);
                const graduationYear = Number(row['graduationYear'] ?? new Date().getFullYear());
                if (!studentId) {
                    errors.push(`Row ${i + 2}: studentId is required`);
                    continue;
                }
                const diplomaRaw = String(row['diplomaStatus'] ?? 'not_retrieved');
                const diplomaStatus = [
                    'retrieved',
                    'not_retrieved',
                ].includes(diplomaRaw)
                    ? diplomaRaw
                    : 'not_retrieved';
                await this.create({ studentId, graduationYear, diplomaStatus }, userId);
                imported++;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Row ${i + 2}: ${message}`);
            }
        }
        if (userId && imported > 0) {
            await this.log(userId, `Bulk imported ${imported} laureate(s)`, {
                imported,
                errorCount: errors.length,
            });
        }
        return { imported, errors };
    }
    log(userId, action, metadata) {
        return this.prisma.activityLog.create({
            data: { userId, action, metadata: metadata },
        });
    }
};
exports.LaureatesService = LaureatesService;
exports.LaureatesService = LaureatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LaureatesService);
//# sourceMappingURL=laureates.service.js.map