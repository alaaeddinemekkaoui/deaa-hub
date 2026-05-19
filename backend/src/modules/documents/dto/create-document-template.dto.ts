import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
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
  isDefault?: boolean;
}
