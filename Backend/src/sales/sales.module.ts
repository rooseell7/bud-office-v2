import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/project.entity';
import { Deal } from '../deals/deal.entity';
import { User } from '../users/user.entity';
import { ProjectNextAction } from './entities/project-next-action.entity';
import { ProjectContact } from './entities/project-contact.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ActivityModule } from '../activity/activity.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Deal, User, ProjectNextAction, ProjectContact]),
    ProjectsModule,
    ActivityModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
