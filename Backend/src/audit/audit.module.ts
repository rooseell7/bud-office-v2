import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { ActivityFeedService } from './activity-feed.service';
import { ActivityFeedController } from './activity-feed.controller';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User, Project]),
  ],
  controllers: [ActivityFeedController],
  providers: [AuditService, ActivityFeedService],
  exports: [AuditService, ActivityFeedService],
})
export class AuditModule {}
