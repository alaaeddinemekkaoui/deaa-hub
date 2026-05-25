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

export class CreateTeacherDto {
  @IsString()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @MaxLength(80)
  lastName: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  cin?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filiereId?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  classIds?: number[];
}
