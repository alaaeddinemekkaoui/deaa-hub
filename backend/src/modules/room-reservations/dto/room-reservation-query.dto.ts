import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
