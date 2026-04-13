import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { RoomReservationPurpose } from '@prisma/client';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class CreateRoomReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId?: number;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM format' })
  startTime: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM format' })
  endTime: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  reservedBy: string;

  @IsEnum(RoomReservationPurpose)
  purpose: RoomReservationPurpose;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  notes?: string;
}
