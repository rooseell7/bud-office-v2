import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { PresenceService } from './presence.service';
import { PresenceStoreService } from './presence-store.service';
import { PresenceRedisStoreService } from './presence-redis-store.service';
import { EditingStoreService } from './editing-store.service';
import { EditingRedisStoreService } from './editing-redis-store.service';
import { PresenceController } from './presence.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceStoreService, PresenceRedisStoreService, EditingStoreService, EditingRedisStoreService],
  exports: [PresenceService, PresenceStoreService, EditingStoreService],
})
export class PresenceModule {}
