import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
