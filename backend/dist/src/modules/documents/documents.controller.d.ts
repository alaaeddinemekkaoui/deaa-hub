import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        student: {
            id: number;
            fullName: string;
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
            id: number;
            fullName: string;
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
    upload(dto: CreateDocumentDto, file?: Express.Multer.File): Promise<{
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
    missing(studentId: number): Promise<string[]>;
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
}
