import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItem } from './work-item.entity';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkItem])],
  providers: [WorkItemsService],
  controllers: [WorkItemsController],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
