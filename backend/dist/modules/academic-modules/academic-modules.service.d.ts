import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
export declare class AcademicModulesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: ModuleQueryDto): Promise<{
        data: ({
            filiere: {
                id: number;
                name: string;
            } | null;
            option: {
                id: number;
                name: string;
            } | null;
            _count: {
                elements: number;
            };
            classes: ({
                class: {
                    id: number;
                    name: string;
                    year: number;
                };
            } & {
                classId: number;
                moduleId: number;
            })[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            filiereId: number | null;
            optionId: number | null;
            semestre: string | null;
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
            id: number;
            name: string;
        } | null;
        option: {
            id: number;
            name: string;
        } | null;
        classes: ({
            class: {
                id: number;
                name: string;
                year: number;
                filiereId: number | null;
                optionId: number | null;
            };
        } & {
            classId: number;
            moduleId: number;
        })[];
        elements: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            classId: number | null;
            type: import(".prisma/client").$Enums.ElementType;
            moduleId: number;
            volumeHoraire: number | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number | null;
        optionId: number | null;
        semestre: string | null;
    }>;
    create(dto: CreateModuleDto): Promise<{
        _count: {
            elements: number;
        };
        classes: ({
            class: {
                id: number;
                name: string;
                year: number;
            };
        } & {
            classId: number;
            moduleId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number | null;
        optionId: number | null;
        semestre: string | null;
    }>;
    update(id: number, dto: UpdateModuleDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number | null;
        optionId: number | null;
        semestre: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number | null;
        optionId: number | null;
        semestre: string | null;
    }>;
    assignClass(moduleId: number, classId: number): Promise<({
        classes: ({
            class: {
                id: number;
                name: string;
                year: number;
            };
        } & {
            classId: number;
            moduleId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        filiereId: number | null;
        optionId: number | null;
        semestre: string | null;
    }) | null>;
    removeClass(moduleId: number, classId: number): Promise<{
        success: boolean;
    }>;
    ensureCoursAndCoursClass(el: {
        id: number;
        name: string;
        cours: {
            id: number;
        } | null;
    }, classId: number): Promise<void>;
    private ensureExists;
    private ensureFiliereExists;
    private ensureOptionExists;
    private ensureClassExists;
}
