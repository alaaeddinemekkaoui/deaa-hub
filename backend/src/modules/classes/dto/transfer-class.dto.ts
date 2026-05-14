import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class TransferClassDto {
  @IsOptional()
  @IsIn(['duplicate', 'existing'])
  transferMode?: 'duplicate' | 'existing';

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((dto: TransferClassDto) => !dto.createTargetClass && dto.transferMode !== 'duplicate')
  @IsInt()
  @Min(1)
  targetClassId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationClassId?: number;

  /** Scolarité year label, e.g. "2025/2026". Purely for tracking — modules are always cloned independently. */
  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  sourceAcademicYear?: string;

  @IsOptional()
  @IsString()
  destinationAcademicYear?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  createTargetClass?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  targetSemestre?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  sourceSemestre?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  destinationSemestre?: string | null;
}
