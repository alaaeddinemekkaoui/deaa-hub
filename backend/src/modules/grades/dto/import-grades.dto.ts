import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ImportGradesDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  classId: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  moduleId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  elementModuleId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  semester?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assessmentType?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @IsString()
  @MaxLength(20)
  academicYear: string;
}
