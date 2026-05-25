import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ClassQueryDto extends PaginationDto {
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
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  year?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  semestre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  optionId?: number;

  @IsOptional()
  @IsIn(['name', 'year', 'academicYear', 'createdAt', 'updatedAt'])
  sortBy: 'name' | 'year' | 'academicYear' | 'createdAt' | 'updatedAt' = 'year';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
