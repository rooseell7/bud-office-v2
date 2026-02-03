import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/project.entity';
import { ForemanEvent } from '../foreman/foreman-event.entity';
import { ExecutionTask } from './execution-task.entity';
import { ExecutionTaskEvent } from './execution-task-event.entity';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ExecutionTask, ExecutionTaskEvent, ForemanEvent]),
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
