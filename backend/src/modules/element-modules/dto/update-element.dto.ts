import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { ElementType } from '@prisma/client';

export class UpdateElementDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  moduleId?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => { if (value === null || value === undefined || value === '') return null; return Number(value); })
  @ValidateIf((_, v) => v !== null) @IsInt() @Min(1)
  volumeHoraire?: number | null;

  @IsOptional() @IsEnum(ElementType)
  type?: ElementType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  classId?: number | null;
}
