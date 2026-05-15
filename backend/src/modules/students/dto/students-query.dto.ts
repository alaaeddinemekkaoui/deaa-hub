import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Sex } from '@prisma/client';

export class StudentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
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
  classId?: number;

  @IsOptional()
  @IsIn([Sex.male, Sex.female])
  gender?: Sex;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  birthYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  entryYear?: number;

  @IsOptional()
  @IsIn(['with', 'without'])
  accountStatus?: 'with' | 'without';

  @IsOptional()
  @IsIn(['yes', 'no'])
  laureateStatus?: 'yes' | 'no';
}
