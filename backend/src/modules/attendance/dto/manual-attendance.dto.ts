import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsInt } from 'class-validator';

export class ManualAttendanceDto {
  @IsInt()
  studentId!: number;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
