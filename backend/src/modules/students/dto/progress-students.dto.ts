import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class StudentProgressEntry {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsString()
  @IsIn(['admis', 'non_admis', 'redoublant'])
  status: 'admis' | 'non_admis' | 'redoublant';
}

export class ProgressStudentsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromClassId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  toClassId: number;

  @IsString()
  academicYear: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentProgressEntry)
  students: StudentProgressEntry[];
}
