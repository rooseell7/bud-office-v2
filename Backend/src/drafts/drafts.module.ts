import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Draft } from './draft.entity';
import { DraftsService } from './drafts.service';
import { DraftsController } from './drafts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Draft])],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
