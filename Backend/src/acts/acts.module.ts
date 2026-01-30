import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Act } from './act.entity';
import { ActsController } from './acts.controller';
import { ActsService } from './acts.service';
import { Document } from '../documents/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Act, Document])],
  controllers: [ActsController],
  providers: [ActsService],
  exports: [ActsService],
})
export class ActsModule {}
