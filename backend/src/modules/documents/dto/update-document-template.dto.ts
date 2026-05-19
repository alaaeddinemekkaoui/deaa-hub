import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  documentTypeId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  header?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  footer?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  signatureLabel?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
