import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class SessionQueryDto extends PaginationDto {
    classId?: number;
    teacherId?: number;
    roomId?: number;
    dayOfWeek?: number;
    weekStart?: string;
}
