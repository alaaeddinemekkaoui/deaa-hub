import { IsInt } from 'class-validator';

export class CreateDocumentDto {
  @IsInt()
  studentId: number;
}
