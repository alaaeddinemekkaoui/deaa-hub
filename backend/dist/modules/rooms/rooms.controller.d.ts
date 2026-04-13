import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        department: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        departmentId: number | null;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    })[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__RoomClient<({
        department: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        departmentId: number | null;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    importFile(file: Express.Multer.File): Promise<{
        imported: number;
        errors: string[];
    }>;
    create(dto: CreateRoomDto): import(".prisma/client").Prisma.Prisma__RoomClient<{
        department: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        departmentId: number | null;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: number, dto: UpdateRoomDto): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        departmentId: number | null;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__RoomClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        departmentId: number | null;
        capacity: number;
        equipment: import("@prisma/client/runtime/library").JsonValue | null;
        availability: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
