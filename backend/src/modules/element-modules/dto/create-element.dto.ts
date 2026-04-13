import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ElementType } from '@prisma/client';

export class CreateElementDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  moduleId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  volumeHoraire?: number | null;

  @IsOptional()
  @IsEnum(ElementType)
  type?: ElementType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId?: number | null;
}
