import { Request } from 'express';
import { LaureatesService } from './laureates.service';
import { CreateLaureateDto } from './dto/create-laureate.dto';
import { UpdateLaureateDto } from './dto/update-laureate.dto';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
type AuthRequest = Request & {
    user: JwtPayload;
};
export declare class LaureatesController {
    private readonly laureatesService;
    constructor(laureatesService: LaureatesService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        student: {
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
        };
        proofDocument: {
            id: number;
            createdAt: Date;
            name: string;
            studentId: number;
            path: string;
            mimeType: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    })[]>;
    findNonLaureateStudents(search?: string): Promise<{
        id: number;
        fullName: string;
        filiere: {
            name: string;
        } | null;
        academicClass: {
            name: string;
        } | null;
        codeMassar: string;
    }[]>;
    importFile(file: Express.Multer.File, req: AuthRequest): Promise<{
        imported: number;
        errors: string[];
    }>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__LaureateClient<({
        student: {
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
        };
        proofDocument: {
            id: number;
            createdAt: Date;
            name: string;
            studentId: number;
            path: string;
            mimeType: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateLaureateDto, req: AuthRequest): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    update(id: number, dto: UpdateLaureateDto, req: AuthRequest): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    remove(id: number, req: AuthRequest): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
}
export {};
