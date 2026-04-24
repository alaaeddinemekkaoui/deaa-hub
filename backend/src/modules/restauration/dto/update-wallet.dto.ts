import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreditWalletDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AdjustWalletDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsNumber()
  @Min(0)
  balance: number;

  @IsOptional()
  @IsString()
  description?: string;
}
