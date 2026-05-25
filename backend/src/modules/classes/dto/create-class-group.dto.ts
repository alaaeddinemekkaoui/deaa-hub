import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClassGroupDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['TP', 'TD', 'GROUP'])
  type: 'TP' | 'TD' | 'GROUP' = 'TD';
}
