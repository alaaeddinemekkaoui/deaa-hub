import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Sex } from '@prisma/client';

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  cin?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string | null;

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
  @IsString()
  dateInscription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filiereId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  classIds?: number[];
}
