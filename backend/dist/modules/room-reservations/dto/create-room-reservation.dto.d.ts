import { RoomReservationPurpose } from '@prisma/client';
export declare class CreateRoomReservationDto {
    roomId: number;
    classId?: number;
    date: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    reservedBy: string;
    purpose: RoomReservationPurpose;
    notes?: string;
}
