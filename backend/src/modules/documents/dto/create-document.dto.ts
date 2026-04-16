import { IsInt, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  teacherId?: number;
}
