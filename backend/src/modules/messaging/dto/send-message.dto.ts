import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  /** 1-to-1: recipient user id */
  @ValidateIf((o: SendMessageDto) => !o.groupId)
  @IsInt()
  recipientId?: number;

  /** Group message: group id */
  @ValidateIf((o: SendMessageDto) => !o.recipientId)
  @IsInt()
  groupId?: number;
}
