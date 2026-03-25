import { ActivityLogsService } from './activity-logs.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
export declare class ActivityLogsController {
    private readonly activityLogsService;
    constructor(activityLogsService: ActivityLogsService);
    findAll(limit?: string): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            id: number;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: number;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        timestamp: Date;
        userId: number;
    })[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__ActivityLogClient<({
        user: {
            id: number;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: number;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        timestamp: Date;
        userId: number;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateActivityLogDto): import(".prisma/client").Prisma.Prisma__ActivityLogClient<{
        id: number;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        timestamp: Date;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: number, dto: Partial<CreateActivityLogDto>): import(".prisma/client").Prisma.Prisma__ActivityLogClient<{
        id: number;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        timestamp: Date;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__ActivityLogClient<{
        id: number;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        timestamp: Date;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
