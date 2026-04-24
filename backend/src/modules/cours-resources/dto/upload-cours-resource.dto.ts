import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UploadCoursResourceDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  coursId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  classId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  teacherId?: number;

  @IsOptional()
  @IsString()
  title?: string;
}
