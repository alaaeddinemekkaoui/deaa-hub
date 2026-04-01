export declare class CreateSessionDto {
    elementId: number;
    classId: number;
    teacherId?: number | null;
    roomId?: number | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    weekStart?: string | null;
}
