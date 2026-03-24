import { PrepaYear, Sex, StudentCycle } from '@prisma/client';
import { Type } from 'class-transformer';
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

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsString()
  codeMassar?: string;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  firstYearEntry?: number;

  @IsOptional()
  @IsString()
  bacType?: string;

  @IsOptional()
  @IsString()
  anneeAcademique?: string;

  @IsOptional()
  @IsDateString()
  dateInscription?: string;
}
