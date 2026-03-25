import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFiliereDto } from './dto/create-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';
export declare class FilieresService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: FiliereQueryDto): Promise<{
        data: ({
            department: {
                id: number;
                name: string;
            };
            _count: {
                teachers: number;
                students: number;
                classes: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
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
            name: string;
        };
        classes: {
            id: number;
            name: string;
            year: number;
            classType: string | null;
            _count: {
                teachers: number;
                students: number;
            };
        }[];
        _count: {
            teachers: number;
            students: number;
            classes: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        departmentId: number;
        filiereType: string | null;
    }>;
    create(dto: CreateFiliereDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        departmentId: number;
        filiereType: string | null;
    }>;
    update(id: number, dto: UpdateFiliereDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        departmentId: number;
        filiereType: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        departmentId: number;
        filiereType: string | null;
    }>;
    private ensureDepartmentExists;
    private ensureFiliereExists;
    private ensureNameAvailable;
    private ensureCodeAvailable;
    importFromBuffer(buffer: Buffer): Promise<{
        imported: number;
        errors: string[];
    }>;
}
