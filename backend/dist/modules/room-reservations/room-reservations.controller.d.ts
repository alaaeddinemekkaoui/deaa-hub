import { RoomReservationsService } from './room-reservations.service';
import { RoomReservationQueryDto } from './dto/room-reservation-query.dto';
import { CreateRoomReservationDto } from './dto/create-room-reservation.dto';
import { UpdateRoomReservationDto } from './dto/update-room-reservation.dto';
export declare class RoomReservationsController {
    private readonly service;
    constructor(service: RoomReservationsService);
    findAll(query: RoomReservationQueryDto): Promise<({
        academicClass: {
            filiere: {
                department: {
                    id: number;
                    name: string;
                };
                id: number;
                name: string;
                code: string;
            } | null;
            id: number;
            name: string;
            year: number;
        } | null;
        room: {
            id: number;
            name: string;
            capacity: number;
            availability: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number | null;
        roomId: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        date: string;
        reservedBy: string;
        purpose: import(".prisma/client").$Enums.RoomReservationPurpose;
        notes: string | null;
    })[]>;
    findOne(id: number): Promise<{
        academicClass: {
            filiere: {
                department: {
                    id: number;
                    name: string;
                };
                id: number;
                name: string;
                code: string;
            } | null;
            id: number;
            name: string;
            year: number;
        } | null;
        room: {
            id: number;
            name: string;
            capacity: number;
            availability: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number | null;
        roomId: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        date: string;
        reservedBy: string;
        purpose: import(".prisma/client").$Enums.RoomReservationPurpose;
        notes: string | null;
    }>;
    create(dto: CreateRoomReservationDto): Promise<{
        academicClass: {
            filiere: {
                department: {
                    id: number;
                    name: string;
                };
                id: number;
                name: string;
                code: string;
            } | null;
            id: number;
            name: string;
            year: number;
        } | null;
        room: {
            id: number;
            name: string;
            capacity: number;
            availability: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number | null;
        roomId: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        date: string;
        reservedBy: string;
        purpose: import(".prisma/client").$Enums.RoomReservationPurpose;
        notes: string | null;
    }>;
    update(id: number, dto: UpdateRoomReservationDto): Promise<{
        academicClass: {
            filiere: {
                department: {
                    id: number;
                    name: string;
                };
                id: number;
                name: string;
                code: string;
            } | null;
            id: number;
            name: string;
            year: number;
        } | null;
        room: {
            id: number;
            name: string;
            capacity: number;
            availability: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number | null;
        roomId: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        date: string;
        reservedBy: string;
        purpose: import(".prisma/client").$Enums.RoomReservationPurpose;
        notes: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number | null;
        roomId: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        date: string;
        reservedBy: string;
        purpose: import(".prisma/client").$Enums.RoomReservationPurpose;
        notes: string | null;
    }>;
}
