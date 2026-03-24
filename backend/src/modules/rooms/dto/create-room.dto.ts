import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsInt()
  capacity: number;

  @IsArray()
  equipment: string[];

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  availability: boolean;
}
