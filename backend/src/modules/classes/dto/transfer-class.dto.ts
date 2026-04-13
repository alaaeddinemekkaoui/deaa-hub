import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TransferClassDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetClassId: number;
}
