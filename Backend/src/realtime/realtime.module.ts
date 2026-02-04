import { Global, Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [ActivityModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
