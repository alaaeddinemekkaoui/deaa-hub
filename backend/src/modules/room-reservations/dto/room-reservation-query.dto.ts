import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class RoomReservationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filiereId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek?: number;

  @IsOptional()
  @IsDateString()
  weekStart?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM format' })
  startTime?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM format' })
  endTime?: string;
}
