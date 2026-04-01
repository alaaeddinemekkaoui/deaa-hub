import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class CoursQueryDto extends PaginationDto {
    search?: string;
    classId?: number;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
