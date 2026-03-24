import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
export declare class StudentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(pagination: PaginationDto, search?: string, filiereId?: number): Promise<{
        data: ({
            filiere: ({
                department: {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            }) | null;
            academicClass: ({
                filiere: {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    departmentId: number;
                    filiereType: string | null;
                } | null;
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                year: number;
                filiereId: number | null;
                classType: string | null;
            }) | null;
            classHistory: ({
                academicClass: {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    year: number;
                    filiereId: number | null;
                    classType: string | null;
                };
            } & {
                id: number;
                createdAt: Date;
                classId: number;
                academicYear: string;
                studentId: number;
                studyYear: number;
            })[];
        } & {
            id: number;
            email: string | null;
            fullName: string;
            createdAt: Date;
            updatedAt: Date;
            filiereId: number | null;
            firstName: string | null;
            lastName: string | null;
            sex: import(".prisma/client").$Enums.Sex;
            cin: string;
            codeMassar: string;
            dateNaissance: Date;
            telephone: string | null;
            cycle: import(".prisma/client").$Enums.StudentCycle;
            prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
            prepaTrack: string | null;
            entryLevel: number | null;
            classId: number | null;
            firstYearEntry: number;
            bacType: string | null;
            anneeAcademique: string;
            dateInscription: Date;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: number): Prisma.Prisma__StudentClient<({
        filiere: ({
            department: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        }) | null;
        academicClass: ({
            filiere: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
        }) | null;
        classHistory: ({
            academicClass: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                year: number;
                filiereId: number | null;
                classType: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            classId: number;
            academicYear: string;
            studentId: number;
            studyYear: number;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        cin: string;
        codeMassar: string;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        firstYearEntry: number;
        bacType: string | null;
        anneeAcademique: string;
        dateInscription: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateStudentDto): Promise<({
        filiere: ({
            department: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        }) | null;
        academicClass: ({
            filiere: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
        }) | null;
        classHistory: ({
            academicClass: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                year: number;
                filiereId: number | null;
                classType: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            classId: number;
            academicYear: string;
            studentId: number;
            studyYear: number;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        cin: string;
        codeMassar: string;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        firstYearEntry: number;
        bacType: string | null;
        anneeAcademique: string;
        dateInscription: Date;
    }) | null>;
    update(id: number, dto: UpdateStudentDto): Promise<({
        filiere: ({
            department: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        }) | null;
        academicClass: ({
            filiere: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
        }) | null;
        classHistory: ({
            academicClass: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                year: number;
                filiereId: number | null;
                classType: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            classId: number;
            academicYear: string;
            studentId: number;
            studyYear: number;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        cin: string;
        codeMassar: string;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        firstYearEntry: number;
        bacType: string | null;
        anneeAcademique: string;
        dateInscription: Date;
    }) | null>;
    remove(id: number): Prisma.Prisma__StudentClient<{
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        cin: string;
        codeMassar: string;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        firstYearEntry: number;
        bacType: string | null;
        anneeAcademique: string;
        dateInscription: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    private buildStudentPayload;
    private resolveStudentNames;
    private parseAcademicStartYear;
    private upsertClassHistory;
    private ensureFiliereExists;
    private ensureClassExists;
}
