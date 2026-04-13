import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  elementId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  teacherId?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  roomId?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek: number;

  @IsString()
  @MaxLength(5)
  startTime: string; // "08:00"

  @IsString()
  @MaxLength(5)
  endTime: string; // "10:00"

  @IsOptional()
  @IsDateString()
  weekStart?: string | null;
}
