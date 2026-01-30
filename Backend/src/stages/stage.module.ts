import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Stage } from './stage.entity';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';
import { Project } from '../projects/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stage, Project])],
  providers: [StageService],
  controllers: [StageController],
})
export class StageModule {}
