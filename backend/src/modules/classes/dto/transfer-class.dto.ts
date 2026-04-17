import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TransferClassDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetClassId: number;

  /** Scolarité year label, e.g. "2025/2026". Purely for tracking — modules are always cloned independently. */
  @IsOptional()
  @IsString()
  academicYear?: string;
}
