import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInternatAssignmentDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  roomId: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
