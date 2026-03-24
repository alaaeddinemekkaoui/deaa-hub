import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { Prisma } from '@prisma/client';
export declare class ActivityLogsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(limit?: number): Prisma.PrismaPromise<({
        user: {
            id: number;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: number;
        userId: number;
        action: string;
        metadata: Prisma.JsonValue | null;
        timestamp: Date;
    })[]>;
    findOne(id: number): Prisma.Prisma__ActivityLogClient<({
        user: {
            id: number;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: number;
        userId: number;
        action: string;
        metadata: Prisma.JsonValue | null;
        timestamp: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateActivityLogDto): Prisma.Prisma__ActivityLogClient<{
        id: number;
        userId: number;
        action: string;
        metadata: Prisma.JsonValue | null;
        timestamp: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: number, dto: Partial<CreateActivityLogDto>): Prisma.Prisma__ActivityLogClient<{
        id: number;
        userId: number;
        action: string;
        metadata: Prisma.JsonValue | null;
        timestamp: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: number): Prisma.Prisma__ActivityLogClient<{
        id: number;
        userId: number;
        action: string;
        metadata: Prisma.JsonValue | null;
        timestamp: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
