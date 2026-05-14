import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PublishGradesDto {
  @IsInt()
  @Min(1)
  classId: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  moduleId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  elementModuleId?: number;

  @IsString()
  @MaxLength(20)
  academicYear: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  semester?: string;
}
