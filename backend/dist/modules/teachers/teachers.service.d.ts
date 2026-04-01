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
            role: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
            _count: {
                department: number;
                filiere: number;
                role: number;
                grade: number;
                taughtClasses: number;
                taughtCours: number;
                sessions: number;
            };
            sessions: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                classId: number;
                teacherId: number | null;
                elementId: number;
                roomId: number | null;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                weekStart: Date | null;
            }[];
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
            taughtCours: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                classId: number;
                teacherId: number | null;
                coursId: number;
                groupLabel: string | null;
            }[];
        } & {
            email: string | null;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            cin: string | null;
            filiereId: number | null;
            dateInscription: Date;
            departmentId: number;
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
        role: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
            taughtCours: number;
            sessions: number;
        };
        sessions: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            classId: number;
            teacherId: number | null;
            elementId: number;
            roomId: number | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            weekStart: Date | null;
        }[];
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
        taughtCours: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            classId: number;
            teacherId: number | null;
            coursId: number;
            groupLabel: string | null;
        }[];
    } & {
        email: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        cin: string | null;
        filiereId: number | null;
        dateInscription: Date;
        departmentId: number;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    create(dto: CreateTeacherDto): Promise<{
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
        role: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        _count: {
            department: number;
            filiere: number;
            role: number;
            grade: number;
            taughtClasses: number;
            taughtCours: number;
            sessions: number;
        };
        sessions: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            classId: number;
            teacherId: number | null;
            elementId: number;
            roomId: number | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            weekStart: Date | null;
        }[];
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
        taughtCours: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            classId: number;
            teacherId: number | null;
            coursId: number;
            groupLabel: string | null;
        }[];
    } & {
        email: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        cin: string | null;
        filiereId: number | null;
        dateInscription: Date;
        departmentId: number;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    update(id: number, dto: UpdateTeacherDto, userId?: number): Promise<{
        email: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        cin: string | null;
        filiereId: number | null;
        dateInscription: Date;
        departmentId: number;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    remove(id: number): Promise<{
        email: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        cin: string | null;
        filiereId: number | null;
        dateInscription: Date;
        departmentId: number;
        phoneNumber: string | null;
        roleId: number;
        gradeId: number;
    }>;
    findCours(teacherId: number): Promise<({
        cours: {
            id: number;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
        };
        class: {
            filiere: {
                id: number;
                name: string;
            } | null;
            id: number;
            name: string;
            year: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number;
        teacherId: number | null;
        coursId: number;
        groupLabel: string | null;
    })[]>;
    findClassLogs(teacherId: number): Promise<{
        user: {
            email: string;
        };
        id: number;
        action: string;
        metadata: Prisma.JsonValue;
        timestamp: Date;
    }[]>;
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
    private ensureClassAssignmentsExist;
    private handleTeacherUniqueErrors;
    private handleCatalogUniqueError;
    importFromBuffer(buffer: Buffer): Promise<{
        imported: number;
        errors: string[];
    }>;
}
