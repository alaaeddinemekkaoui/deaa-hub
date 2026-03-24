import { IsString, MaxLength } from 'class-validator';

export class CreateTeacherGradeDto {
  @IsString()
  @MaxLength(120)
  name: string;
}
