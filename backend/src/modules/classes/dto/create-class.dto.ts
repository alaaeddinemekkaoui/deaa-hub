import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateClassDto {
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
  @Max(6)
  year: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(20)
  academicYear?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  semestre?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  departmentId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  filiereId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  optionId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  cycleId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(80)
  classType?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  createNextSemestre?: boolean;
}
