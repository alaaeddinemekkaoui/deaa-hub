import { PrepaYear, Sex, StudentCycle } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
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
  @IsString()
  codeEtudiant?: string;

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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+$/i, {
    message: 'linkedInUrl must be a valid LinkedIn URL',
  })
  linkedInUrl?: string | null;

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
