import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionQueryDto } from './dto/option-query.dto';
export declare class OptionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: OptionQueryDto): Promise<{
        data: ({
            filiere: {
                department: {
                    id: number;
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
            };
            _count: {
                classes: number;
                modules: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            filiereId: number;
            code: string | null;
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
        filiere: {
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
        };
        _count: {
            classes: number;
            modules: number;
        };
        modules: ({
            _count: {
                elements: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            filiereId: number | null;
            optionId: number | null;
            semestre: string | null;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number;
        code: string | null;
    }>;
    create(dto: CreateOptionDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number;
        code: string | null;
    }>;
    update(id: number, dto: UpdateOptionDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number;
        code: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number;
        code: string | null;
    }>;
    private ensureFiliereExists;
    private ensureNameAvailable;
}
