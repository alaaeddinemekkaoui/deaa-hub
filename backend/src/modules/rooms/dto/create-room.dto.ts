import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  departmentId?: number;
}
