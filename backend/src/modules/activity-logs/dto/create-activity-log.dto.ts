import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateActivityLogDto {
  @IsInt()
  userId: number;

  @IsString()
  action: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
