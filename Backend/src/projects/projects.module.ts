import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ActivityModule } from '../activity/activity.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ActivityModule,
    AttachmentsModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
