import { GroupType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(GroupType)
  type: GroupType;

  /** filiereId / departmentId / cycleId for auto-groups */
  @IsOptional()
  @IsInt()
  referenceId?: number;

  /** Initial member user IDs */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  memberIds?: number[];
}
