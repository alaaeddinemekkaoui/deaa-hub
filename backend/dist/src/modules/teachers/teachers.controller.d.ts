import { Request } from 'express';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
type AuthRequest = Request & {
    user: JwtPayload;
};
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { CreateTeacherRoleDto } from './dto/create-teacher-role.dto';
import { UpdateTeacherRoleDto } from './dto/update-teacher-role.dto';
import { CreateTeacherGradeDto } from './dto/create-teacher-grade.dto';
import { UpdateTeacherGradeDto } from './dto/update-teacher-grade.dto';
export declare class TeachersController {
    private readonly teachersService;
    constructor(teachersService: TeachersService);
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
            _count: {
                department: number;
                filiere: number;
                role: number;
                grade: number;
                taughtClasses: number;
            };
        } & {
            id: number;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            departmentId: number;
            filiereId: number | null;
            cin: string | null;
            firstName: string;
            lastName: string;
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
    findRoles(): import(".prisma/client").Prisma.PrismaPromise<({
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
    findGrades(): import(".prisma/client").Prisma.PrismaPromise<({
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
    importFile(file: Express.Multer.File): Promise<{
        imported: number;
        errors: string[];
    }>;
    findClassLogs(id: number): Promise<{
        id: number;
        user: {
            email: string;
        };
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        timestamp: Date;
    }[]>;
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
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
        };
    } & {
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        cin: string | null;
        firstName: string;
        lastName: string;
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
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
        };
    } & {
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        cin: string | null;
        firstName: string;
        lastName: string;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    update(id: number, dto: UpdateTeacherDto, req: AuthRequest): Promise<{
        id: number;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        departmentId: number;
        filiereId: number | null;
        cin: string | null;
        firstName: string;
        lastName: string;
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
        cin: string | null;
        firstName: string;
        lastName: string;
        dateInscription: Date;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
}
export {};
