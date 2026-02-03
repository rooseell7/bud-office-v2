import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

import { ExecutionTaskPriority } from '../execution-task.entity';

export class CreateExecutionTaskDto {
  @IsOptional()
  @IsInt()
  stageId?: number | null;

  @IsString()
  @MinLength(1, { message: 'Назва обовʼязкова' })
  @MaxLength(512)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsInt()
  assigneeId: number;

  @IsOptional()
  @IsEnum(ExecutionTaskPriority)
  priority?: ExecutionTaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
