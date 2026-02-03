import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ObjectsController } from './objects.controller';
import { ObjectsService } from './object.service';
import { Project } from '../projects/project.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), UsersModule],
  controllers: [ObjectsController],
  providers: [ObjectsService],
})
export class ObjectsModule {}
