import { WorkflowStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  @IsOptional()
  @IsString()
  timelineNote?: string;
}
