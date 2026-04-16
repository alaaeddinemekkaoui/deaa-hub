import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GradeQueryDto extends PaginationDto {
  /** Override base max to prevent runaway fetches on this resource */
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(500)
  override limit = 100;
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  teacherId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  classId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  moduleId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  elementModuleId?: number;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsString()
  assessmentType?: string;
}
