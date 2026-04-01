import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateElementDto } from './dto/create-element.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ElementQueryDto } from './dto/element-query.dto';
export declare class ElementModulesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: ElementQueryDto): Promise<{
        data: ({
            module: {
                filiere: {
                    id: number;
                    name: string;
                } | null;
                option: {
                    id: number;
                    name: string;
                } | null;
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                filiereId: number | null;
                optionId: number | null;
                semestre: string | null;
            };
            _count: {
                sessions: number;
            };
            class: {
                id: number;
                name: string;
                year: number;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            classId: number | null;
            type: import(".prisma/client").$Enums.ElementType;
            moduleId: number;
            volumeHoraire: number | null;
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
        module: {
            filiere: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            } | null;
            option: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                filiereId: number;
                code: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            filiereId: number | null;
            optionId: number | null;
            semestre: string | null;
        };
        sessions: ({
            teacher: {
                id: number;
                firstName: string;
                lastName: string;
            } | null;
            room: {
                id: number;
                name: string;
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
            elementId: number;
            roomId: number | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            weekStart: Date | null;
        })[];
        class: {
            id: number;
            name: string;
            year: number;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        classId: number | null;
        type: import(".prisma/client").$Enums.ElementType;
        moduleId: number;
        volumeHoraire: number | null;
    }>;
    create(dto: CreateElementDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        classId: number | null;
        type: import(".prisma/client").$Enums.ElementType;
        moduleId: number;
        volumeHoraire: number | null;
    }>;
    update(id: number, dto: UpdateElementDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        classId: number | null;
        type: import(".prisma/client").$Enums.ElementType;
        moduleId: number;
        volumeHoraire: number | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        classId: number | null;
        type: import(".prisma/client").$Enums.ElementType;
        moduleId: number;
        volumeHoraire: number | null;
    }>;
    private ensureExists;
    private ensureModuleExists;
    private ensureClassExists;
}
