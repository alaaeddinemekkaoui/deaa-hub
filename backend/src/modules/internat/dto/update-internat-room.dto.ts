import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInternatRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
