import { Request } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { TransferStudentsDto } from './dto/transfer-students.dto';
import { ProgressStudentsDto } from './dto/progress-students.dto';
import { StudentsQueryDto } from './dto/students-query.dto';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
type AuthRequest = Request & {
    user: JwtPayload;
};
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    findAll(query: StudentsQueryDto): Promise<{
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
                decisionStatus: string | null;
            })[];
            laureate: {
                id: number;
                graduationYear: number;
                diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
            } | null;
        } & {
            id: number;
            email: string | null;
            fullName: string;
            createdAt: Date;
            updatedAt: Date;
            filiereId: number | null;
            cin: string;
            codeMassar: string;
            firstName: string | null;
            lastName: string | null;
            sex: import(".prisma/client").$Enums.Sex;
            dateNaissance: Date;
            telephone: string | null;
            cycle: import(".prisma/client").$Enums.StudentCycle;
            prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
            prepaTrack: string | null;
            entryLevel: number | null;
            classId: number | null;
            bacType: string | null;
            firstYearEntry: number;
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
    findByClass(classId: number): Promise<{
        id: number;
        fullName: string;
        filiere: {
            id: number;
            name: string;
        } | null;
        codeMassar: string;
        firstYearEntry: number;
        anneeAcademique: string;
    }[]>;
    importFile(file: Express.Multer.File): Promise<{
        imported: number;
        errors: string[];
    }>;
    transfer(dto: TransferStudentsDto, req: AuthRequest): Promise<{
        transferred: number;
        errors: string[];
    }>;
    progress(dto: ProgressStudentsDto, req: AuthRequest): Promise<{
        processed: number;
        errors: string[];
    }>;
    makeLaureate(id: number, body: {
        graduationYear: number;
    }): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    removeLaureate(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    } | null>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__StudentClient<({
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
            decisionStatus: string | null;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        cin: string;
        codeMassar: string;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        bacType: string | null;
        firstYearEntry: number;
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
            decisionStatus: string | null;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        cin: string;
        codeMassar: string;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        bacType: string | null;
        firstYearEntry: number;
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
            decisionStatus: string | null;
        })[];
    } & {
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        cin: string;
        codeMassar: string;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        bacType: string | null;
        firstYearEntry: number;
        anneeAcademique: string;
        dateInscription: Date;
    }) | null>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__StudentClient<{
        id: number;
        email: string | null;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        filiereId: number | null;
        cin: string;
        codeMassar: string;
        firstName: string | null;
        lastName: string | null;
        sex: import(".prisma/client").$Enums.Sex;
        dateNaissance: Date;
        telephone: string | null;
        cycle: import(".prisma/client").$Enums.StudentCycle;
        prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
        prepaTrack: string | null;
        entryLevel: number | null;
        classId: number | null;
        bacType: string | null;
        firstYearEntry: number;
        anneeAcademique: string;
        dateInscription: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
export {};
