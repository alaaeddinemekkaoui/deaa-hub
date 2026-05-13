import { IsInt, IsString, Min } from 'class-validator';

export class CreateInternatRoomDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;
}
