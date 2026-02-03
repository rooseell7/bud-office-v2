import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../finance/transaction.entity';
import { Wallet } from '../finance/wallet.entity';
import { Category } from '../finance/category.entity';
import { Project } from '../projects/project.entity';
import { ExecutionTask } from '../execution/execution-task.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Wallet, Category, Project, ExecutionTask]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
