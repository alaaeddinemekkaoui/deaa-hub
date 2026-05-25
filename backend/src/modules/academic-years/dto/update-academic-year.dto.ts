import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAcademicYearDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  endYear?: number;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
