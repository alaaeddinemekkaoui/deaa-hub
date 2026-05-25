import { Transform, Type } from 'class-transformer';
import { PrepaYear, Sex, StudentCycle } from '@prisma/client';
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

  @IsOptional()
  @IsString()
  codeEtudiant?: string;

  @IsDateString()
  dateNaissance: string;

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
