import { IsString, MaxLength } from 'class-validator';

export class CreateTeacherRoleDto {
  @IsString()
  @MaxLength(120)
  name: string;
}
