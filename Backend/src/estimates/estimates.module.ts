import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Project, User])],
  controllers: [EstimatesController],
  providers: [EstimatesService],
})
export class EstimatesModule {}
