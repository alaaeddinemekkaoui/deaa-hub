import { CoursService } from './cours.service';
import { CreateCoursDto } from './dto/create-cours.dto';
import { UpdateCoursDto } from './dto/update-cours.dto';
import { CoursQueryDto } from './dto/cours-query.dto';
import { AssignCoursClassDto } from './dto/assign-cours-class.dto';
export declare class CoursController {
    private readonly coursService;
    constructor(coursService: CoursService);
    findAll(query: CoursQueryDto): Promise<{
        data: ({
            elementModule: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
                volumeHoraire: number | null;
            } | null;
            _count: {
                classes: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
            elementModuleId: number | null;
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
        elementModule: {
            module: {
                id: number;
                name: string;
            };
            id: number;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
            volumeHoraire: number | null;
        } | null;
        classes: ({
            teacher: {
                id: number;
                firstName: string;
                lastName: string;
            } | null;
            class: {
                filiere: ({
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
                }) | null;
            } & {
                option: string | null;
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                year: number;
                filiereId: number | null;
                classType: string | null;
                cycleId: number | null;
                optionId: number | null;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            classId: number;
            teacherId: number | null;
            coursId: number;
            groupLabel: string | null;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.ElementType;
        elementModuleId: number | null;
    }>;
    create(dto: CreateCoursDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.ElementType;
        elementModuleId: number | null;
    }>;
    update(id: number, dto: UpdateCoursDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.ElementType;
        elementModuleId: number | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.ElementType;
        elementModuleId: number | null;
    }>;
    assignToClass(id: number, dto: AssignCoursClassDto): Promise<({
        teacher: {
            id: number;
            firstName: string;
            lastName: string;
        } | null;
        class: {
            option: string | null;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
            cycleId: number | null;
            optionId: number | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number;
        teacherId: number | null;
        coursId: number;
        groupLabel: string | null;
    }) | ({
        teacher: {
            id: number;
            firstName: string;
            lastName: string;
        } | null;
        class: {
            option: string | null;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
            cycleId: number | null;
            optionId: number | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number;
        teacherId: number | null;
        coursId: number;
        groupLabel: string | null;
    })[]>;
    removeFromClass(id: number, classId: number, teacherId?: string): Promise<import(".prisma/client").Prisma.BatchPayload | {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number;
        teacherId: number | null;
        coursId: number;
        groupLabel: string | null;
    }>;
    importFromClass(classId: number): Promise<{
        created: number;
        existing: number;
        total: number;
    }>;
}
