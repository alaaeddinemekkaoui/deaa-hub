import { ElementType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class ElementQueryDto extends PaginationDto {
    search?: string;
    moduleId?: number;
    classId?: number;
    type?: ElementType;
    sortBy: 'name' | 'type' | 'volumeHoraire' | 'createdAt';
    sortOrder: 'asc' | 'desc';
}
