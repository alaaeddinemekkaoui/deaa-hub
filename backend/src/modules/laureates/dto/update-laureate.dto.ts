import { DiplomaStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class UpdateLaureateDto {
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @IsOptional()
  @IsEnum(DiplomaStatus)
  diplomaStatus?: DiplomaStatus;

  @IsOptional()
  @IsInt()
  proofDocumentId?: number;
}
