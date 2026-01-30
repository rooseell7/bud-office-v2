import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ObjectsController } from './objects.controller';
import { ObjectsService } from './object.service';
import { Project } from '../projects/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ObjectsController],
  providers: [ObjectsService],
})
export class ObjectsModule {}
