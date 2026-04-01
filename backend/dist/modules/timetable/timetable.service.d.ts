import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionQueryDto } from './dto/session-query.dto';
export declare class TimetableService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: SessionQueryDto): Promise<{
        data: ({
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
                id: number;
                name: string;
                year: number;
            };
            element: {
                module: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                classId: number | null;
                type: import(".prisma/client").$Enums.ElementType;
                moduleId: number;
                volumeHoraire: number | null;
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
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findWeek(classId: number, weekStart: string): Promise<{
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
                id: number;
                name: string;
                year: number;
            };
            element: {
                module: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                classId: number | null;
                type: import(".prisma/client").$Enums.ElementType;
                moduleId: number;
                volumeHoraire: number | null;
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
        conflicts: {
            sessionIds: number[];
            reason: string;
        }[];
    }>;
    create(dto: CreateSessionDto): Promise<{
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
            id: number;
            name: string;
            year: number;
        };
        element: {
            module: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            classId: number | null;
            type: import(".prisma/client").$Enums.ElementType;
            moduleId: number;
            volumeHoraire: number | null;
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
    }>;
    update(id: number, dto: Partial<CreateSessionDto>): Promise<{
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
            id: number;
            name: string;
            year: number;
        };
        element: {
            module: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            classId: number | null;
            type: import(".prisma/client").$Enums.ElementType;
            moduleId: number;
            volumeHoraire: number | null;
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
    }>;
    remove(id: number): Promise<{
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
    }>;
    checkConflicts(classId: number, weekStart?: string): Promise<{
        sessionIds: number[];
        reason: string;
    }[]>;
    private detectConflicts;
    private timesOverlap;
    private ensureSessionExists;
    private ensureElementExists;
    private ensureClassExists;
    private ensureTeacherExists;
    private ensureRoomExists;
}
