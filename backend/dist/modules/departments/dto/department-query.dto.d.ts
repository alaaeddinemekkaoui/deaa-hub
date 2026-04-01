import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class DepartmentQueryDto extends PaginationDto {
    search?: string;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
