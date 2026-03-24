import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class FiliereQueryDto extends PaginationDto {
    search?: string;
    departmentId?: number;
    sortBy: 'name' | 'code' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
