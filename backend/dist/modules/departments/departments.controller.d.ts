import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    findAll(query: DepartmentQueryDto): Promise<{
        data: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            _count: {
                teachers: number;
                filieres: number;
            };
            name: string;
        }[];
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
        _count: {
            teachers: number;
            filieres: number;
        };
        filieres: {
            id: number;
            _count: {
                students: number;
                classes: number;
            };
            name: string;
            code: string;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    create(dto: CreateDepartmentDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    update(id: number, dto: UpdateDepartmentDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
}
