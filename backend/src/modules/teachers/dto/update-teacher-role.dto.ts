import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeacherRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
