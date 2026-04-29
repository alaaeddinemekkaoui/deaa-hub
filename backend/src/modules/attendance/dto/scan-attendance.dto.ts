import { IsString, MinLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  @MinLength(24)
  token!: string;
}
