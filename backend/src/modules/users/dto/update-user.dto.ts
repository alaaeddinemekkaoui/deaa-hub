import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '../../../common/types/role.type';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+$/i, {
    message: 'linkedInUrl must be a valid LinkedIn URL',
  })
  linkedInUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  departmentIds?: number[];
}
