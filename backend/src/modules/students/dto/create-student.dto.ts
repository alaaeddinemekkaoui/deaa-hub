import { Type } from 'class-transformer';
import { PrepaYear, Sex, StudentCycle } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStudentDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsEnum(Sex)
  sex: Sex;

  @IsString()
  cin: string;

  @IsString()
  codeMassar: string;

  @IsDateString()
  dateNaissance: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEnum(StudentCycle)
  cycle?: StudentCycle;

  @IsOptional()
  @IsEnum(PrepaYear)
  prepaYear?: PrepaYear;

  @IsOptional()
  @IsString()
  prepaTrack?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  entryLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  filiereId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  firstYearEntry: number;

  @IsOptional()
  @IsString()
  bacType?: string;

  @IsString()
  anneeAcademique: string;

  @IsDateString()
  dateInscription: string;
}
