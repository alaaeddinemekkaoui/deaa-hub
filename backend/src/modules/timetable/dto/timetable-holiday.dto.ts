import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class TimetableHolidayDto {
  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
