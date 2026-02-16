/**
 * STEP 10: Notifications service.
 */
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { OutboxService } from '../realtime/outbox/outbox.service';

export type CreateNotificationParams = {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const notif = this.repo.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        projectId: params.projectId ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        payload: params.payload ?? null,
      });
      await qr.manager.save(notif);
      await this.outboxService.enqueueTx(qr.manager, {
        eventType: 'notify',
        scopeType: 'user',
        scopeId: params.userId,
        entityType: params.entityType ?? 'notification',
        entityId: String(notif.id),
        payload: {
          notificationId: Number(notif.id),
          type: params.type,
          title: params.title,
          projectId: params.projectId ?? null,
          entity: params.entityType && params.entityId
            ? { type: params.entityType, id: params.entityId }
            : null,
          createdAt: notif.createdAt?.toISOString?.(),
        },
      });
      await qr.commitTransaction();
      return notif;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async findForUser(
    userId: number,
    opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = {},
  ): Promise<{ items: Notification[]; nextCursor: string | null }> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n."userId" = :userId', { userId })
      .orderBy('n."createdAt"', 'DESC')
      .take(limit + 1);
    if (opts.unreadOnly) qb.andWhere('n."readAt" IS NULL');
    if (opts.cursor) {
      const c = parseInt(opts.cursor, 10);
      if (Number.isFinite(c)) qb.andWhere('n.id < :cursor', { cursor: c });
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].id) : null;
    return { items, nextCursor };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.repo.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async markRead(id: string, userId: number): Promise<void> {
    const notif = await this.repo.findOne({ where: { id: id as any, userId } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) throw new ForbiddenException('Not your notification');
    notif.readAt = new Date();
    await this.repo.save(notif);
  }
}
