import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInternatAssignmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
