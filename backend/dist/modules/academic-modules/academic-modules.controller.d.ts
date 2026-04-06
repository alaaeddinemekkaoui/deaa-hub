import { AcademicModulesService } from './academic-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
import { AssignModuleClassDto } from './dto/assign-module-class.dto';
export declare class AcademicModulesController {
    private readonly service;
    constructor(service: AcademicModulesService);
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
    assignClass(id: number, dto: AssignModuleClassDto): Promise<({
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
    removeClass(id: number, classId: number): Promise<{
        success: boolean;
    }>;
}
