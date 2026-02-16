/**
 * STEP 10: Notifications API.
 */
import { Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

function getUserId(req: any): number {
  const id = req?.user?.id ?? req?.user?.sub;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : 0;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const userId = getUserId(req);
    const result = await this.notificationsService.findForUser(userId, {
      unreadOnly: unreadOnly === '1' || unreadOnly === 'true',
      limit: limit ? Math.min(200, parseInt(limit, 10) || 50) : 50,
      cursor: cursor ?? undefined,
    });
    return {
      items: result.items.map((n) => ({
        id: String(n.id),
        createdAt: n.createdAt?.toISOString?.(),
        type: n.type,
        title: n.title,
        body: n.body,
        projectId: n.projectId,
        entityType: n.entityType,
        entityId: n.entityId,
        payload: n.payload,
        readAt: n.readAt?.toISOString?.(),
      })),
      nextCursor: result.nextCursor,
    };
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const userId = getUserId(req);
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = getUserId(req);
    await this.notificationsService.markRead(id, userId);
    return { ok: true };
  }
}
