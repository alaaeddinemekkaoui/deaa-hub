import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCoursResourceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  coursId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  classId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  teacherId?: number;
}
