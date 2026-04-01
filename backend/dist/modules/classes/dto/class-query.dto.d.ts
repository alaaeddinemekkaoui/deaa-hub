import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class ClassQueryDto extends PaginationDto {
    search?: string;
    filiereId?: number;
    departmentId?: number;
    year?: number;
    cycleId?: number;
    optionId?: number;
    sortBy: 'name' | 'year' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
