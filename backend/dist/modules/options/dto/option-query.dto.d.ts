import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class OptionQueryDto extends PaginationDto {
    search?: string;
    filiereId?: number;
    departmentId?: number;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
