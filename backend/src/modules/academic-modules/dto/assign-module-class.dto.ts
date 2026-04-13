import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignModuleClassDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;
}
