import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateModuleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(10)
  semestre?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filiereId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  optionId?: number | null;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  classIds: number[];
}
