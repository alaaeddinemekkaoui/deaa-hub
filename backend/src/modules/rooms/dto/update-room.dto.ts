import {
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsArray()
  equipment?: string[];

  @IsOptional()
  @IsBoolean()
  availability?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return null;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  departmentId?: number | null;
}
