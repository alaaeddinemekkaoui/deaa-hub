import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAccreditationLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coursId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moduleId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  elementId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  semestre?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  volumeHoraire?: number | null;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}
