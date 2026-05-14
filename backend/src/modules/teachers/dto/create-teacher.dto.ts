import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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
