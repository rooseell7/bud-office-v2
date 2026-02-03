import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/project.entity';
import { ForemanEvent } from './foreman-event.entity';
import { ExecutionTask } from '../execution/execution-task.entity';
import { ExecutionTaskEvent } from '../execution/execution-task-event.entity';
import { ForemanController } from './foreman.controller';
import { ForemanService } from './foreman.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ForemanEvent, ExecutionTask, ExecutionTaskEvent]),
  ],
  controllers: [ForemanController],
  providers: [ForemanService],
})
export class ForemanModule implements OnModuleInit {
  constructor(private readonly foremanService: ForemanService) {}

  async onModuleInit() {
    await this.foremanService.ensureForemanEventsTable();
  }
}
