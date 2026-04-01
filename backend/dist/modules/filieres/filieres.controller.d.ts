import { FilieresService } from './filieres.service';
import { CreateFiliereDto } from './dto/create-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';
export declare class FilieresController {
    private readonly filieresService;
    constructor(filieresService: FilieresService);
    findAll(query: FiliereQueryDto): Promise<{
        data: ({
            department: {
                id: number;
                name: string;
            };
            _count: {
                students: number;
                teachers: number;
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
    importFile(file: Express.Multer.File): Promise<{
        imported: number;
        errors: string[];
    }>;
    findOne(id: number): Promise<{
        department: {
            id: number;
            name: string;
        };
        _count: {
            students: number;
            teachers: number;
            classes: number;
        };
        classes: {
            id: number;
            _count: {
                students: number;
                teachers: number;
            };
            name: string;
            year: number;
            classType: string | null;
        }[];
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
}
