import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class BulkGradeEntryDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsInt()
  studentId: number;

  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class BulkUpsertGradesDto {
  @IsInt()
  classId: number;

  @IsOptional()
  @IsInt()
  teacherId?: number;

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
  @Min(1)
  maxScore?: number;

  @IsString()
  @MaxLength(20)
  academicYear: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkGradeEntryDto)
  grades: BulkGradeEntryDto[];
}

export { BulkGradeEntryDto };
