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
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
let TeachersService = class TeachersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, search, departmentId, filiereId, roleId, gradeId, sortBy, sortOrder, } = query;
        const filters = [];
        if (search) {
            filters.push({
                OR: [
                    {
                        firstName: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        lastName: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        phoneNumber: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        cin: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        role: {
                            is: {
                                name: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                    {
                        grade: {
                            is: {
                                name: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                ],
            });
        }
        if (departmentId) {
            filters.push({ departmentId });
        }
        if (filiereId) {
            filters.push({ filiereId });
        }
        if (roleId) {
            filters.push({ roleId });
        }
        if (gradeId) {
            filters.push({ gradeId });
        }
        const where = filters.length > 0 ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.teacher.findMany({
                where,
                include: this.buildTeacherInclude(),
                skip: (page - 1) * limit,
                take: limit,
                orderBy: sortBy === 'lastName'
                    ? [{ lastName: sortOrder }, { firstName: sortOrder }]
                    : [
                        { [sortBy]: sortOrder },
                        { lastName: 'asc' },
                        { firstName: 'asc' },
                    ],
            }),
            this.prisma.teacher.count({ where }),
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
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            include: this.buildTeacherInclude(),
        });
        if (!teacher) {
            throw new common_1.NotFoundException(`Teacher ${id} not found`);
        }
        return teacher;
    }
    async create(dto) {
        const departmentId = dto.departmentId;
        const filiereId = dto.filiereId ?? null;
        const classIds = await this.ensureClassAssignmentsExist(dto.classIds ?? []);
        await this.ensureDepartmentExists(departmentId);
        await this.ensureRoleExists(dto.roleId);
        await this.ensureGradeExists(dto.gradeId);
        if (filiereId) {
            await this.ensureFiliereBelongsToDepartment(filiereId, departmentId);
        }
        try {
            return await this.prisma.teacher.create({
                data: {
                    firstName: dto.firstName.trim(),
                    lastName: dto.lastName.trim(),
                    cin: this.normalizeOptionalValue(dto.cin) ?? null,
                    email: this.normalizeOptionalValue(dto.email)?.toLowerCase() ?? null,
                    phoneNumber: this.normalizeOptionalValue(dto.phoneNumber) ?? null,
                    dateInscription: dto.dateInscription
                        ? new Date(dto.dateInscription)
                        : undefined,
                    departmentId,
                    filiereId,
                    roleId: dto.roleId,
                    gradeId: dto.gradeId,
                    taughtClasses: classIds.length
                        ? {
                            create: classIds.map((classId) => ({ classId })),
                        }
                        : undefined,
                },
                include: this.buildTeacherInclude(),
            });
        }
        catch (error) {
            this.handleTeacherUniqueErrors(error);
            throw error;
        }
    }
    async update(id, dto, userId) {
        const existing = await this.prisma.teacher.findUnique({
            where: { id },
            select: {
                id: true,
                departmentId: true,
                filiereId: true,
                roleId: true,
                gradeId: true,
                taughtClasses: {
                    select: {
                        classId: true,
                    },
                },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Teacher ${id} not found`);
        }
        const nextDepartmentId = dto.departmentId ?? existing.departmentId;
        const nextFiliereId = dto.filiereId !== undefined
            ? (dto.filiereId ?? null)
            : existing.filiereId;
        const nextRoleId = dto.roleId ?? existing.roleId;
        const nextGradeId = dto.gradeId ?? existing.gradeId;
        await this.ensureDepartmentExists(nextDepartmentId);
        await this.ensureRoleExists(nextRoleId);
        await this.ensureGradeExists(nextGradeId);
        if (nextFiliereId) {
            await this.ensureFiliereBelongsToDepartment(nextFiliereId, nextDepartmentId);
        }
        const nextClassIds = dto.classIds !== undefined
            ? await this.ensureClassAssignmentsExist(dto.classIds)
            : await this.ensureClassAssignmentsExist(existing.taughtClasses.map((entry) => entry.classId));
        const oldClassIds = existing.taughtClasses.map((e) => e.classId);
        let result;
        try {
            result = await this.prisma.teacher.update({
                where: { id },
                data: {
                    ...(dto.firstName !== undefined
                        ? { firstName: dto.firstName.trim() }
                        : {}),
                    ...(dto.lastName !== undefined
                        ? { lastName: dto.lastName.trim() }
                        : {}),
                    ...(dto.cin !== undefined
                        ? {
                            cin: this.normalizeOptionalValue(dto.cin) ?? null,
                        }
                        : {}),
                    ...(dto.email !== undefined
                        ? {
                            email: this.normalizeOptionalValue(dto.email)?.toLowerCase() ?? null,
                        }
                        : {}),
                    ...(dto.phoneNumber !== undefined
                        ? {
                            phoneNumber: this.normalizeOptionalValue(dto.phoneNumber) ?? null,
                        }
                        : {}),
                    ...(dto.dateInscription !== undefined
                        ? {
                            dateInscription: new Date(dto.dateInscription),
                        }
                        : {}),
                    ...(dto.departmentId !== undefined
                        ? { departmentId: nextDepartmentId }
                        : {}),
                    ...(dto.filiereId !== undefined ? { filiereId: nextFiliereId } : {}),
                    ...(dto.roleId !== undefined ? { roleId: nextRoleId } : {}),
                    ...(dto.gradeId !== undefined ? { gradeId: nextGradeId } : {}),
                    ...(dto.classIds !== undefined
                        ? {
                            taughtClasses: {
                                deleteMany: {},
                                create: nextClassIds.map((classId) => ({ classId })),
                            },
                        }
                        : {}),
                },
                include: this.buildTeacherInclude(),
            });
        }
        catch (error) {
            this.handleTeacherUniqueErrors(error);
            throw error;
        }
        if (userId && dto.classIds !== undefined) {
            await this.prisma.activityLog.create({
                data: {
                    userId,
                    action: 'UPDATE_TEACHER_CLASSES',
                    metadata: {
                        teacherId: id,
                        previousClassIds: oldClassIds,
                        newClassIds: nextClassIds,
                    },
                },
            });
        }
        return result;
    }
    async remove(id) {
        await this.ensureTeacherExists(id);
        return this.prisma.teacher.delete({ where: { id } });
    }
    async findCours(teacherId) {
        await this.ensureTeacherExists(teacherId);
        return this.prisma.coursClass.findMany({
            where: { teacherId },
            include: {
                cours: { select: { id: true, name: true, type: true } },
                class: {
                    select: {
                        id: true,
                        name: true,
                        year: true,
                        filiere: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findClassLogs(teacherId) {
        return this.prisma.activityLog.findMany({
            where: {
                action: 'UPDATE_TEACHER_CLASSES',
                metadata: {
                    path: ['teacherId'],
                    equals: teacherId,
                },
            },
            orderBy: { timestamp: 'desc' },
            take: 50,
            select: {
                id: true,
                action: true,
                metadata: true,
                timestamp: true,
                user: { select: { email: true } },
            },
        });
    }
    findRoles() {
        return this.prisma.teacherRole.findMany({
            include: {
                _count: {
                    select: {
                        teachers: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createRole(dto) {
        try {
            return await this.prisma.teacherRole.create({
                data: {
                    name: dto.name.trim(),
                },
                include: {
                    _count: {
                        select: {
                            teachers: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleCatalogUniqueError(error, 'Teacher role');
            throw error;
        }
    }
    async updateRole(id, dto) {
        await this.ensureRoleExists(id);
        try {
            return await this.prisma.teacherRole.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                },
                include: {
                    _count: {
                        select: {
                            teachers: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleCatalogUniqueError(error, 'Teacher role');
            throw error;
        }
    }
    async removeRole(id) {
        const role = await this.prisma.teacherRole.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        teachers: true,
                    },
                },
            },
        });
        if (!role) {
            throw new common_1.NotFoundException(`Teacher role ${id} not found`);
        }
        if (role._count.teachers > 0) {
            throw new common_1.BadRequestException('Teacher role cannot be deleted while teachers are still attached');
        }
        return this.prisma.teacherRole.delete({ where: { id } });
    }
    findGrades() {
        return this.prisma.teacherGrade.findMany({
            include: {
                _count: {
                    select: {
                        teachers: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createGrade(dto) {
        try {
            return await this.prisma.teacherGrade.create({
                data: {
                    name: dto.name.trim(),
                },
                include: {
                    _count: {
                        select: {
                            teachers: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleCatalogUniqueError(error, 'Teacher grade');
            throw error;
        }
    }
    async updateGrade(id, dto) {
        await this.ensureGradeExists(id);
        try {
            return await this.prisma.teacherGrade.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                },
                include: {
                    _count: {
                        select: {
                            teachers: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleCatalogUniqueError(error, 'Teacher grade');
            throw error;
        }
    }
    async removeGrade(id) {
        const grade = await this.prisma.teacherGrade.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        teachers: true,
                    },
                },
            },
        });
        if (!grade) {
            throw new common_1.NotFoundException(`Teacher grade ${id} not found`);
        }
        if (grade._count.teachers > 0) {
            throw new common_1.BadRequestException('Teacher grade cannot be deleted while teachers are still attached');
        }
        return this.prisma.teacherGrade.delete({ where: { id } });
    }
    buildTeacherInclude() {
        return {
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
            filiere: {
                select: {
                    id: true,
                    name: true,
                    departmentId: true,
                    department: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            role: {
                select: {
                    id: true,
                    name: true,
                },
            },
            grade: {
                select: {
                    id: true,
                    name: true,
                },
            },
            taughtClasses: {
                include: {
                    class: {
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
                        },
                    },
                },
                orderBy: {
                    class: {
                        year: 'desc',
                    },
                },
            },
        };
    }
    normalizeOptionalValue(value) {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
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
    async ensureFiliereBelongsToDepartment(filiereId, departmentId) {
        const filiere = await this.prisma.filiere.findUnique({
            where: { id: filiereId },
            select: {
                id: true,
                departmentId: true,
            },
        });
        if (!filiere) {
            throw new common_1.NotFoundException(`Filiere ${filiereId} not found`);
        }
        if (filiere.departmentId !== departmentId) {
            throw new common_1.BadRequestException('Selected filiere must belong to the chosen department');
        }
    }
    async ensureRoleExists(id) {
        const role = await this.prisma.teacherRole.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!role) {
            throw new common_1.NotFoundException(`Teacher role ${id} not found`);
        }
    }
    async ensureGradeExists(id) {
        const grade = await this.prisma.teacherGrade.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!grade) {
            throw new common_1.NotFoundException(`Teacher grade ${id} not found`);
        }
    }
    async ensureTeacherExists(id) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!teacher) {
            throw new common_1.NotFoundException(`Teacher ${id} not found`);
        }
    }
    async ensureClassAssignmentsExist(classIds) {
        if (classIds.length === 0) {
            return [];
        }
        const uniqueClassIds = Array.from(new Set(classIds));
        const classes = await this.prisma.academicClass.findMany({
            where: {
                id: {
                    in: uniqueClassIds,
                },
            },
            select: {
                id: true,
            },
        });
        if (classes.length !== uniqueClassIds.length) {
            throw new common_1.BadRequestException('One or more assigned classes are invalid');
        }
        return uniqueClassIds;
    }
    handleTeacherUniqueErrors(error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002') {
            const targets = Array.isArray(error.meta?.target)
                ? error.meta?.target
                : [];
            if (targets.includes('email')) {
                throw new common_1.ConflictException('Teacher email already exists');
            }
            if (targets.includes('cin')) {
                throw new common_1.ConflictException('Teacher CIN already exists');
            }
        }
    }
    handleCatalogUniqueError(error, label) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002') {
            throw new common_1.ConflictException(`${label} already exists`);
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
                const departmentId = Number(row['departmentId'] ?? 0);
                const roleId = Number(row['roleId'] ?? 0);
                const gradeId = Number(row['gradeId'] ?? 0);
                if (!departmentId || !roleId || !gradeId) {
                    errors.push(`Row ${i + 2}: departmentId, roleId, and gradeId are required`);
                    continue;
                }
                await this.create({
                    firstName: String(row['firstName'] ?? '').trim(),
                    lastName: String(row['lastName'] ?? '').trim(),
                    cin: row['cin'] ? String(row['cin']).trim() : undefined,
                    email: row['email'] ? String(row['email']).trim() : undefined,
                    phoneNumber: row['phoneNumber']
                        ? String(row['phoneNumber']).trim()
                        : undefined,
                    departmentId,
                    filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
                    roleId,
                    gradeId,
                    dateInscription: row['dateInscription']
                        ? String(row['dateInscription']).trim()
                        : undefined,
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
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map