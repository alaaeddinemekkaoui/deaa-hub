import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeacherGradeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
