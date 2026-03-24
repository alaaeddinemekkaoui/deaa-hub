import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { CreateTeacherRoleDto } from './dto/create-teacher-role.dto';
import { UpdateTeacherRoleDto } from './dto/update-teacher-role.dto';
import { CreateTeacherGradeDto } from './dto/create-teacher-grade.dto';
import { UpdateTeacherGradeDto } from './dto/update-teacher-grade.dto';
export declare class TeachersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: TeacherQueryDto): Promise<{
        data: ({
            role: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
            department: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
            filiere: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            } | null;
            _count: {
                department: number;
                filiere: number;
                role: number;
                grade: number;
                taughtClasses: number;
            };
            grade: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
            taughtClasses: {
                id: number;
                createdAt: Date;
                classId: number;
                teacherId: number;
            }[];
        } & {
            id: number;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            departmentId: number;
            filiereId: number | null;
            firstName: string;
            lastName: string;
            cin: string | null;
            dateInscription: Date;
            phoneNumber: string | null;
            roleId: number;
            gradeId: number;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findOne(id: number): Promise<{
        role: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        department: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        filiere: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        } | null;
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
        };
        grade: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        taughtClasses: {
            id: number;
            createdAt: Date;
            classId: number;
            teacherId: number;
        }[];
    } & {
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        firstName: string;
        lastName: string;
        cin: string | null;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    create(dto: CreateTeacherDto): Promise<{
        role: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        department: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        filiere: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        } | null;
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
        };
        grade: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        taughtClasses: {
            id: number;
            createdAt: Date;
            classId: number;
            teacherId: number;
        }[];
    } & {
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        firstName: string;
        lastName: string;
        cin: string | null;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    update(id: number, dto: UpdateTeacherDto): Promise<{
        role: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        department: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        filiere: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        } | null;
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
        };
        grade: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        taughtClasses: {
            id: number;
            createdAt: Date;
            classId: number;
            teacherId: number;
        }[];
    } & {
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        firstName: string;
        lastName: string;
        cin: string | null;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        firstName: string;
        lastName: string;
        cin: string | null;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    findRoles(): Prisma.PrismaPromise<({
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    })[]>;
    createRole(dto: CreateTeacherRoleDto): Promise<{
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    updateRole(id: number, dto: UpdateTeacherRoleDto): Promise<{
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    removeRole(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    findGrades(): Prisma.PrismaPromise<({
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    })[]>;
    createGrade(dto: CreateTeacherGradeDto): Promise<{
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    updateGrade(id: number, dto: UpdateTeacherGradeDto): Promise<{
        _count: {
            teachers: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    removeGrade(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    private buildTeacherInclude;
    private normalizeOptionalValue;
    private ensureDepartmentExists;
    private ensureFiliereBelongsToDepartment;
    private ensureRoleExists;
    private ensureGradeExists;
    private ensureTeacherExists;
    private ensureClassAssignmentsBelongToScope;
    private handleTeacherUniqueErrors;
    private handleCatalogUniqueError;
}
