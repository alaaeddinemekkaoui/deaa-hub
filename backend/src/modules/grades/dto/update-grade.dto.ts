import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @IsInt()
  classId?: number;

  @IsOptional()
  @IsInt()
  moduleId?: number;

  @IsOptional()
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
  @IsNumber()
  @Min(0)
  @Max(20)
  score?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  rattrapageScore?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rattrapageMaxScore?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
