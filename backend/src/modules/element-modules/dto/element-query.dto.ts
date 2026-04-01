import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ElementType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ElementQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @MaxLength(80)
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  moduleId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  classId?: number;

  @IsOptional() @IsEnum(ElementType)
  type?: ElementType;

  @IsOptional() @IsIn(['name', 'type', 'volumeHoraire', 'createdAt'])
  sortBy: 'name' | 'type' | 'volumeHoraire' | 'createdAt' = 'name';

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
