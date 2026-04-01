import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class ModuleQueryDto extends PaginationDto {
    search?: string;
    filiereId?: number;
    optionId?: number;
    sortBy: 'name' | 'semestre' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
