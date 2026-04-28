import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';

export class MealReservationItemDto {
  @IsInt()
  @Min(1)
  mealId: number;

  @IsDateString()
  reservationDate: string;
}

export class ReserveMealDto {
  @IsInt()
  @Min(1)
  mealId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsDateString()
  reservationDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class ReserveMealsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealReservationItemDto)
  items: MealReservationItemDto[];
}

export class IssueTicketDto {
  @IsInt()
  @Min(1)
  reservationId: number;
}

export class ConsumeTicketDto {
  @IsString()
  code: string;
}
