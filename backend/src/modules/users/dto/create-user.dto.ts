import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../common/types/role.type';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  departmentIds?: number[];
}
