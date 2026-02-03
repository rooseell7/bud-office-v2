import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateExecutionTaskDto } from './create-execution-task.dto';
import { ExecutionTaskStatus, ExecutionTaskPriority } from '../execution-task.entity';

export class UpdateExecutionTaskDto extends PartialType(CreateExecutionTaskDto) {
  @IsOptional()
  @IsEnum(ExecutionTaskStatus)
  status?: ExecutionTaskStatus;

  @IsOptional()
  @IsEnum(ExecutionTaskPriority)
  priority?: ExecutionTaskPriority;
}
