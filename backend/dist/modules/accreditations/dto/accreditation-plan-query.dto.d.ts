import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class AccreditationPlanQueryDto extends PaginationDto {
    search?: string;
    academicYear?: string;
    filiereId?: number;
    sortBy: 'name' | 'academicYear' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
