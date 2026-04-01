import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SessionQueryDto extends PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  classId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  teacherId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  roomId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  dayOfWeek?: number;

  @IsOptional() @IsDateString()
  weekStart?: string;
}
