import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLaureateDto } from './dto/create-laureate.dto';
import { UpdateLaureateDto } from './dto/update-laureate.dto';
export declare class LaureatesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    create(dto: CreateLaureateDto, userId?: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    update(id: number, dto: UpdateLaureateDto, userId?: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    remove(id: number, userId?: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        graduationYear: number;
        diplomaStatus: import(".prisma/client").$Enums.DiplomaStatus;
        proofDocumentId: number | null;
    }>;
    importFromBuffer(buffer: Buffer, userId?: number): Promise<{
        imported: number;
        errors: string[];
    }>;
    private log;
}
