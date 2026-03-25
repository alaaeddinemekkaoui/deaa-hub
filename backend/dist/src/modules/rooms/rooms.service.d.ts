import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateRoomDto): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: number, dto: UpdateRoomDto): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    importFromBuffer(buffer: Buffer): Promise<{
        imported: number;
        errors: string[];
    }>;
}
