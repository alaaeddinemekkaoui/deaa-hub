import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

export class CreateDocumentTemplateDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  documentTypeId?: number;

  @IsString()
  @MaxLength(3000)
  header!: string;

  @IsString()
  @MaxLength(6000)
  body!: string;

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
  eSignatureEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  eSignatureSignerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  eSignatureSignerTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  eSignatureStampText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  eSignaturePositionX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  eSignaturePositionY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1)
  eSignatureWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.03)
  @Max(1)
  eSignatureHeight?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
