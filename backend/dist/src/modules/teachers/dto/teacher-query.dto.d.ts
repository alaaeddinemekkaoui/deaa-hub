import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class TeacherQueryDto extends PaginationDto {
    search?: string;
    departmentId?: number;
    filiereId?: number;
    roleId?: number;
    gradeId?: number;
    sortBy: 'lastName' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
}
