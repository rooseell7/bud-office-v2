import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity';
import { Project } from '../projects/project.entity';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Project])],
  controllers: [EstimatesController],
  providers: [EstimatesService],
})
export class EstimatesModule {}
