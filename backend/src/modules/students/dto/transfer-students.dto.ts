import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TransferStudentsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromClassId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  toClassId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  studentIds: number[];

  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  semestre?: string;
}
