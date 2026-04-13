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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(pagination, search, filiereId) {
        const where = {
            ...(search
                ? {
                    OR: [
                        { fullName: { contains: search } },
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                        { codeMassar: { contains: search } },
                        { cin: { contains: search } },
                    ],
                }
                : {}),
            ...(filiereId ? { filiereId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.student.findMany({
                where,
                include: {
                    filiere: { include: { department: true } },
                    academicClass: {
                        include: {
                            filiere: true,
                        },
                    },
                    classHistory: {
                        include: {
                            academicClass: true,
                        },
                        orderBy: {
                            academicYear: 'desc',
                        },
                    },
                    laureate: {
                        select: { id: true, graduationYear: true, diplomaStatus: true },
                    },
                },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.student.count({ where }),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit),
            },
        };
    }
    findOne(id) {
        return this.prisma.student.findUnique({
            where: { id },
            include: {
                filiere: { include: { department: true } },
                academicClass: {
                    include: {
                        filiere: true,
                    },
                },
                classHistory: {
                    include: {
                        academicClass: true,
                    },
                    orderBy: {
                        academicYear: 'desc',
                    },
                },
            },
        });
    }
    async create(dto) {
        const payload = (await this.buildStudentPayload(dto));
        const student = await this.prisma.student.create({
            data: payload,
        });
        await this.upsertClassHistory(student.id, payload.classId ?? dto.classId, payload.anneeAcademique ?? dto.anneeAcademique, payload.firstYearEntry ?? dto.firstYearEntry);
        return this.findOne(student.id);
    }
    async update(id, dto) {
        const existing = await this.prisma.student.findUnique({
            where: { id },
            select: {
                id: true,
                sex: true,
                cycle: true,
                prepaYear: true,
                prepaTrack: true,
                entryLevel: true,
                filiereId: true,
                classId: true,
                firstYearEntry: true,
                anneeAcademique: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Student ${id} not found`);
        }
        const payload = (await this.buildStudentPayload(dto, existing));
        const updated = await this.prisma.student.update({
            where: { id },
            data: payload,
        });
        await this.upsertClassHistory(updated.id, payload.classId !== undefined ? payload.classId : existing.classId, payload.anneeAcademique !== undefined
            ? payload.anneeAcademique
            : existing.anneeAcademique, payload.firstYearEntry !== undefined
            ? payload.firstYearEntry
            : existing.firstYearEntry);
        return this.findOne(updated.id);
    }
    remove(id) {
        return this.prisma.student.delete({ where: { id } });
    }
    async buildStudentPayload(dto, existing) {
        const normalizedNames = this.resolveStudentNames(dto, existing);
        const cycle = dto.cycle ?? existing?.cycle ?? client_1.StudentCycle.prepa;
        const filiereId = dto.filiereId !== undefined
            ? (dto.filiereId ?? null)
            : (existing?.filiereId ?? null);
        const classId = dto.classId !== undefined
            ? (dto.classId ?? null)
            : (existing?.classId ?? null);
        if (filiereId) {
            await this.ensureFiliereExists(filiereId);
        }
        if (classId) {
            const academicClass = await this.ensureClassExists(classId);
            if (filiereId &&
                academicClass.filiereId &&
                academicClass.filiereId !== filiereId) {
                throw new common_1.BadRequestException('Selected class does not belong to the selected filière');
            }
        }
        const payload = {
            ...normalizedNames,
            ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
            ...(dto.cin !== undefined ? { cin: dto.cin } : {}),
            ...(dto.codeMassar !== undefined ? { codeMassar: dto.codeMassar } : {}),
            ...(dto.dateNaissance
                ? { dateNaissance: new Date(dto.dateNaissance) }
                : {}),
            ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
            ...(dto.telephone !== undefined
                ? { telephone: dto.telephone ?? null }
                : {}),
            ...(dto.cycle !== undefined ? { cycle: dto.cycle } : {}),
            ...(dto.bacType !== undefined ? { bacType: dto.bacType ?? null } : {}),
            ...(dto.firstYearEntry !== undefined
                ? { firstYearEntry: dto.firstYearEntry }
                : {}),
            ...(dto.anneeAcademique !== undefined
                ? { anneeAcademique: dto.anneeAcademique }
                : {}),
            ...(dto.dateInscription
                ? { dateInscription: new Date(dto.dateInscription) }
                : {}),
            ...(dto.cycle !== undefined || !existing ? { cycle } : {}),
            ...(dto.filiereId !== undefined ? { filiereId } : {}),
            ...(dto.classId !== undefined ? { classId } : {}),
        };
        if (cycle === client_1.StudentCycle.prepa) {
            const nextPrepaYear = dto.prepaYear ?? existing?.prepaYear;
            payload.prepaYear = nextPrepaYear ?? null;
            payload.prepaTrack =
                dto.prepaTrack !== undefined
                    ? (dto.prepaTrack ?? null)
                    : (existing?.prepaTrack ?? null);
            payload.entryLevel = null;
        }
        else {
            const nextEntryLevel = dto.entryLevel !== undefined
                ? (dto.entryLevel ?? null)
                : (existing?.entryLevel ?? null);
            payload.entryLevel = nextEntryLevel;
            payload.prepaYear = null;
            payload.prepaTrack = null;
        }
        return payload;
    }
    resolveStudentNames(dto, existing) {
        const trimmedFirstName = dto.firstName?.trim();
        const trimmedLastName = dto.lastName?.trim();
        const trimmedFullName = dto.fullName?.trim();
        const hasProvidedFirstOrLast = dto.firstName !== undefined || dto.lastName !== undefined;
        if (!existing) {
            if (!trimmedFullName && (!trimmedFirstName || !trimmedLastName)) {
                throw new common_1.BadRequestException('Provide fullName or both firstName and lastName');
            }
        }
        if (hasProvidedFirstOrLast) {
            const nextFirstName = trimmedFirstName ?? null;
            const nextLastName = trimmedLastName ?? null;
            const nextFullName = trimmedFullName
                ? trimmedFullName
                : [nextFirstName, nextLastName].filter(Boolean).join(' ').trim() ||
                    null;
            return {
                firstName: nextFirstName,
                lastName: nextLastName,
                ...(nextFullName ? { fullName: nextFullName } : {}),
            };
        }
        if (dto.fullName !== undefined && trimmedFullName) {
            const [firstPart, ...rest] = trimmedFullName.split(' ');
            const guessedFirstName = firstPart?.trim() || null;
            const guessedLastName = rest.join(' ').trim() || null;
            return {
                fullName: trimmedFullName,
                firstName: guessedFirstName,
                lastName: guessedLastName,
            };
        }
        return {};
    }
    parseAcademicStartYear(value) {
        if (typeof value !== 'string') {
            return null;
        }
        const match = value.match(/\d{4}/);
        if (!match) {
            return null;
        }
        const parsed = Number(match[0]);
        if (!Number.isInteger(parsed)) {
            return null;
        }
        return parsed;
    }
    async upsertClassHistory(studentId, classId, academicYear, firstYearEntry, decisionStatus) {
        const normalizedClassId = Number(classId);
        if (!Number.isInteger(normalizedClassId) || normalizedClassId < 1) {
            return;
        }
        if (typeof academicYear !== 'string' || !academicYear.trim()) {
            return;
        }
        const normalizedFirstYearEntry = Number(firstYearEntry);
        if (!Number.isInteger(normalizedFirstYearEntry) ||
            normalizedFirstYearEntry < 1900 ||
            normalizedFirstYearEntry > 2100) {
            return;
        }
        const startYear = this.parseAcademicStartYear(academicYear);
        const computedStudyYear = startYear
            ? Math.max(1, startYear - normalizedFirstYearEntry + 1)
            : 1;
        await this.prisma.studentClassHistory.upsert({
            where: {
                studentId_academicYear: {
                    studentId,
                    academicYear,
                },
            },
            update: {
                classId: normalizedClassId,
                studyYear: computedStudyYear,
                ...(decisionStatus ? { decisionStatus } : {}),
            },
            create: {
                studentId,
                classId: normalizedClassId,
                academicYear,
                studyYear: computedStudyYear,
                ...(decisionStatus ? { decisionStatus } : {}),
            },
        });
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
    async ensureClassExists(id) {
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id },
            select: {
                id: true,
                filiereId: true,
            },
        });
        if (!academicClass) {
            throw new common_1.NotFoundException(`Class ${id} not found`);
        }
        return academicClass;
    }
    async findByClass(classId) {
        return this.prisma.student.findMany({
            where: { classId },
            select: {
                id: true,
                fullName: true,
                codeMassar: true,
                anneeAcademique: true,
                firstYearEntry: true,
                filiere: { select: { id: true, name: true } },
            },
            orderBy: { fullName: 'asc' },
        });
    }
    async transferStudents(dto, userId) {
        const toClass = await this.prisma.academicClass.findUnique({
            where: { id: dto.toClassId },
            select: { id: true, name: true, filiereId: true },
        });
        if (!toClass) {
            throw new common_1.NotFoundException(`Target class ${dto.toClassId} not found`);
        }
        let transferred = 0;
        const errors = [];
        for (const studentId of dto.studentIds) {
            try {
                const student = await this.prisma.student.findUnique({
                    where: { id: studentId },
                    select: {
                        id: true,
                        fullName: true,
                        firstYearEntry: true,
                        classId: true,
                        filiereId: true,
                        anneeAcademique: true,
                    },
                });
                if (!student) {
                    errors.push(`Student ${studentId}: not found`);
                    continue;
                }
                if (student.classId !== dto.fromClassId) {
                    errors.push(`Student ${student.fullName}: not enrolled in source class`);
                    continue;
                }
                await this.prisma.student.update({
                    where: { id: studentId },
                    data: {
                        classId: dto.toClassId,
                        anneeAcademique: dto.academicYear,
                        ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
                    },
                });
                await this.upsertClassHistory(studentId, dto.toClassId, dto.academicYear, student.firstYearEntry);
                transferred++;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Student ${studentId}: ${message}`);
            }
        }
        if (userId) {
            await this.prisma.activityLog.create({
                data: {
                    userId,
                    action: 'TRANSFER_STUDENTS',
                    metadata: {
                        fromClassId: dto.fromClassId,
                        toClassId: dto.toClassId,
                        academicYear: dto.academicYear,
                        studentIds: dto.studentIds,
                        transferred,
                        errors: errors.length,
                    },
                },
            });
        }
        return { transferred, errors };
    }
    async progressStudents(dto, userId) {
        const toClass = await this.prisma.academicClass.findUnique({
            where: { id: dto.toClassId },
            select: { id: true, name: true, filiereId: true },
        });
        if (!toClass) {
            throw new common_1.NotFoundException(`Target class ${dto.toClassId} not found`);
        }
        let processed = 0;
        const errors = [];
        for (const entry of dto.students) {
            try {
                const student = await this.prisma.student.findUnique({
                    where: { id: entry.id },
                    select: {
                        id: true,
                        fullName: true,
                        firstYearEntry: true,
                        classId: true,
                        filiereId: true,
                        anneeAcademique: true,
                    },
                });
                if (!student) {
                    errors.push(`Étudiant ${entry.id}: introuvable`);
                    continue;
                }
                if (student.classId !== dto.fromClassId) {
                    errors.push(`${student.fullName}: non inscrit dans la classe source`);
                    continue;
                }
                if (entry.status === 'admis') {
                    await this.prisma.student.update({
                        where: { id: entry.id },
                        data: {
                            classId: dto.toClassId,
                            anneeAcademique: dto.academicYear,
                            ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
                        },
                    });
                    await this.upsertClassHistory(entry.id, dto.toClassId, dto.academicYear, student.firstYearEntry, 'admis');
                }
                else {
                    await this.prisma.student.update({
                        where: { id: entry.id },
                        data: { anneeAcademique: dto.academicYear },
                    });
                    await this.upsertClassHistory(entry.id, dto.fromClassId, dto.academicYear, student.firstYearEntry, entry.status);
                }
                processed++;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Étudiant ${entry.id}: ${message}`);
            }
        }
        if (userId) {
            await this.prisma.activityLog.create({
                data: {
                    userId,
                    action: 'PROGRESS_STUDENTS',
                    metadata: {
                        fromClassId: dto.fromClassId,
                        toClassId: dto.toClassId,
                        academicYear: dto.academicYear,
                        processed,
                        errors: errors.length,
                    },
                },
            });
        }
        return { processed, errors };
    }
    async makeLaureate(studentId, graduationYear) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, fullName: true },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student ${studentId} not found`);
        }
        const existing = await this.prisma.laureate.findUnique({
            where: { studentId },
        });
        if (existing) {
            return this.prisma.laureate.update({
                where: { studentId },
                data: { graduationYear },
            });
        }
        return this.prisma.laureate.create({
            data: {
                studentId,
                graduationYear,
            },
        });
    }
    async removeLaureate(studentId) {
        const laureate = await this.prisma.laureate.findUnique({
            where: { studentId },
        });
        if (!laureate) {
            return null;
        }
        return this.prisma.laureate.delete({
            where: { studentId },
        });
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
                const classIdRaw = Number(row['classId'] ?? row['ClassId'] ?? 0);
                if (!classIdRaw) {
                    errors.push(`Row ${i + 2}: classId is required`);
                    continue;
                }
                const dto = {
                    firstName: String(row['firstName'] ?? row['Prénom'] ?? '').trim() || undefined,
                    lastName: String(row['lastName'] ?? row['Nom'] ?? '').trim() || undefined,
                    fullName: row['fullName']
                        ? String(row['fullName']).trim()
                        : undefined,
                    cin: String(row['cin'] ?? row['CIN'] ?? '').trim(),
                    codeMassar: String(row['codeMassar'] ?? row['Code Massar'] ?? '').trim(),
                    sex: (['male', 'female'].includes(String(row['sex']).toLowerCase())
                        ? String(row['sex']).toLowerCase()
                        : 'male'),
                    firstYearEntry: Number(row['firstYearEntry'] ?? new Date().getFullYear()),
                    anneeAcademique: String(row['anneeAcademique'] ?? row['Année Académique'] ?? '2025/2026').trim(),
                    classId: classIdRaw,
                    filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
                    email: row['email'] ? String(row['email']).trim() : undefined,
                    telephone: row['telephone']
                        ? String(row['telephone']).trim()
                        : undefined,
                    bacType: row['bacType'] ? String(row['bacType']).trim() : undefined,
                    dateNaissance: row['dateNaissance']
                        ? String(row['dateNaissance']).trim()
                        : '1990-01-01',
                    dateInscription: row['dateInscription']
                        ? String(row['dateInscription']).trim()
                        : new Date().toISOString().split('T')[0],
                };
                await this.create(dto);
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
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map