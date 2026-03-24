import { DiplomaStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class CreateLaureateDto {
  @IsInt()
  studentId: number;

  @IsInt()
  graduationYear: number;

  @IsOptional()
  @IsEnum(DiplomaStatus)
  diplomaStatus?: DiplomaStatus;

  @IsOptional()
  @IsInt()
  proofDocumentId?: number;
}
