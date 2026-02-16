import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { AuditModule } from '../audit/audit.module';
import { PresenceModule } from '../presence/presence.module';
import { RealtimeService } from './realtime.service';
import { RealtimeEmitterService } from './realtime-emitter.service';
import { OutboxEvent } from './outbox/outbox-event.entity';
import { OutboxService } from './outbox/outbox.service';
import { OutboxPublisher } from './outbox/outbox.publisher';
import { OutboxHygieneService } from './outbox/outbox-hygiene.service';
import { RealtimeController } from './realtime.controller';

@Global()
@Module({
  imports: [
    ActivityModule,
    AuditModule,
    PresenceModule,
    TypeOrmModule.forFeature([OutboxEvent]),
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService, OutboxService, OutboxPublisher, OutboxHygieneService, RealtimeEmitterService],
  exports: [RealtimeService, RealtimeEmitterService, OutboxService],
})
export class RealtimeModule {}
