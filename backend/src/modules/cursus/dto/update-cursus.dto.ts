import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ElementType } from '@prisma/client';

export class CursusElementDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsEnum(ElementType)
  type?: ElementType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  volumeHoraire?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionDurationMinutes?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ponderation?: number;
}

export class CursusModuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  semestre?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CursusElementDto)
  elements?: CursusElementDto[];
}

export class UpdateCursusDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CursusModuleDto)
  modules?: CursusModuleDto[];
}
