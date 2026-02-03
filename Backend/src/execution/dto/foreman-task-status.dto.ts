import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExecutionTaskStatus } from '../execution-task.entity';

export class ForemanTaskStatusDto {
  @IsEnum(ExecutionTaskStatus)
  status: ExecutionTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  blockedReason?: string;
}
