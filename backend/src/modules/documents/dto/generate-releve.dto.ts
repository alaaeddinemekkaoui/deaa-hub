import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GenerateReleveDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  documentTypeId?: number;
}
