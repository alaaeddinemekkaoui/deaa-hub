import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ModuleQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filiereId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  optionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classYear?: number;

  @IsOptional()
  @IsIn(['name', 'semestre', 'createdAt', 'updatedAt'])
  sortBy: 'name' | 'semestre' | 'createdAt' | 'updatedAt' = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
