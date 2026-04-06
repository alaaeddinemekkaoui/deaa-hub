import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
export declare class DocumentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getUploadBaseDir;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        student: {
            fullName: string;
            id: number;
            codeMassar: string;
        };
    } & {
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    })[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__DocumentClient<({
        student: {
            fullName: string;
            id: number;
            codeMassar: string;
        };
    } & {
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateDocumentDto, file?: Express.Multer.File): Promise<{
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    }>;
    findByStudent(studentId: number): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    }[]>;
    update(id: number, dto: {
        name?: string;
        studentId?: number;
    }): import(".prisma/client").Prisma.Prisma__DocumentClient<{
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__DocumentClient<{
        id: number;
        createdAt: Date;
        name: string;
        studentId: number;
        path: string;
        mimeType: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    missingDocuments(studentId: number): Promise<string[]>;
}
