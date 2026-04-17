import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAcademicYearDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
