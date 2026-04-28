import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @IsString()
  category?: string;
}
