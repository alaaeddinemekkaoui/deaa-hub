import { IsInt, Max, Min } from 'class-validator';

export class ExtendAttendanceDto {
  @IsInt()
  @Min(1)
  @Max(240)
  minutes!: number;
}
