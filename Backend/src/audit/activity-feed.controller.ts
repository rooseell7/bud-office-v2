/**
 * STEP 6: Activity Feed API based on audit_log.
 */
import { Controller, Get, Query, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityFeedService } from './activity-feed.service';

function getUserId(req: any): number {
  const id = req?.user?.id ?? req?.user?.sub;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : 0;
}

@Controller('activity/feed')
@UseGuards(JwtAuthGuard)
export class ActivityFeedController {
  constructor(private readonly feedService: ActivityFeedService) {}

  @Get()
  async getFeed(
    @Req() req: any,
    @Query('scope') scope?: string,
    @Query('projectId') projectId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('actionPrefix') actionPrefix?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const scopeVal = scope && ['global', 'project', 'entity'].includes(scope) ? scope : 'global';
    const projectIdNum = projectId ? parseInt(projectId, 10) : null;
    const actorUserIdNum = actorUserId ? parseInt(actorUserId, 10) : null;
    const limitNum = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    const userId = getUserId(req);

    return this.feedService.getFeed(
      {
        scope: scopeVal as 'global' | 'project' | 'entity',
        projectId: Number.isFinite(projectIdNum) ? projectIdNum : null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        actorUserId: Number.isFinite(actorUserIdNum) ? actorUserIdNum : null,
        actionPrefix: actionPrefix ?? null,
        from: from ?? null,
        to: to ?? null,
        cursor: cursor ?? null,
        limit: limitNum,
      },
      userId,
    );
  }

  @Get('entity/:entityType/:entityId')
  async getEntityActivity(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    const userId = getUserId(req);
    return this.feedService.getFeed(
      {
        scope: 'entity',
        entityType,
        entityId,
        cursor: cursor ?? null,
        limit: limitNum,
      },
      userId,
    );
  }

  @Get('project/:projectId')
  async getProjectActivity(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const projectIdNum = parseInt(projectId, 10);
    if (!Number.isFinite(projectIdNum)) {
      return { items: [], nextCursor: null };
    }
    const limitNum = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    const userId = getUserId(req);
    return this.feedService.getFeed(
      {
        scope: 'project',
        projectId: projectIdNum,
        cursor: cursor ?? null,
        limit: limitNum,
      },
      userId,
    );
  }
}
