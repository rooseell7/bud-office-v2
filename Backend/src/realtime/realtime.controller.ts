import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedisService } from '../infra/redis/redis.service';
import { PresenceStoreService } from '../presence/presence-store.service';
import { OutboxService } from './outbox/outbox.service';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly realtimeService: RealtimeService,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly presenceStore: PresenceStoreService,
  ) {}

  @Get('health')
  async health(): Promise<{
    ok: boolean;
    db: string;
    redis: string;
    wsAdapter: string;
    outboxPending: number;
    oldestPendingSeconds: number | null;
    dlqCount: number;
    presenceGlobal: number;
  }> {
    let db: string = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      db = 'error';
    }
    let redis: string = 'n/a';
    if (this.redis.isEnabled()) {
      redis = (await this.redis.ping()) ? 'ok' : 'error';
    }
    const server = this.realtimeService.getServer();
    const wsAdapter = server?.sockets?.adapter ? 'ok' : 'none';
    const [outboxPending, oldestPendingSeconds, dlqCount] = await Promise.all([
      this.outboxService.getPendingCount(),
      this.outboxService.getOldestPendingSeconds(),
      this.outboxService.getDlqCount(),
    ]);
    const globalPresence = await this.presenceStore.getGlobalAsync();
    const presenceGlobal = globalPresence.length;
    const ok = db === 'ok' && (redis !== 'error') && dlqCount === 0;
    return {
      ok,
      db,
      redis,
      wsAdapter,
      outboxPending,
      oldestPendingSeconds,
      dlqCount,
      presenceGlobal,
    };
  }

  @Get('metrics')
  async metrics(): Promise<Record<string, number>> {
    const server = this.realtimeService.getServer();
    const wsClients = server?.sockets?.sockets?.size ?? 0;
    const wsRooms = server?.sockets?.adapter?.rooms?.size ?? 0;
    const [outboxPending, oldestPendingSeconds, dlqCount] = await Promise.all([
      this.outboxService.getPendingCount(),
      this.outboxService.getOldestPendingSeconds(),
      this.outboxService.getDlqCount(),
    ]);
    const globalPresence = await this.presenceStore.getGlobalAsync();
    return {
      ws_clients_total: wsClients,
      ws_rooms_total: wsRooms,
      presence_global_count: globalPresence.length,
      outbox_pending_count: outboxPending,
      outbox_oldest_pending_seconds: oldestPendingSeconds ?? 0,
      outbox_dlq_count: dlqCount,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sync')
  async sync(
    @Req() req: any,
    @Query('sinceEventId') sinceEventId?: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
    @Query('limit') limit?: string,
  ) {
    const since = sinceEventId != null ? parseInt(sinceEventId, 10) : 0;
    const scope = scopeType && ['global', 'project', 'user'].includes(scopeType) ? scopeType : 'global';
    const scopeIdNum = scopeId != null && scopeId !== '' ? parseInt(scopeId, 10) : null;
    const limitNum = Math.min(parseInt(limit || '500', 10) || 500, 2000);

    const events = await this.outboxService.getSince(
      Number.isFinite(since) ? since : 0,
      scope,
      scopeIdNum,
      limitNum,
    );
    return {
      events: events.map((e) => ({
        id: Number(e.id),
        eventType: e.eventType,
        entityType: e.entityType,
        entityId: e.entityId,
        payload: e.payload,
        ts: e.createdAt?.toISOString?.(),
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dlq')
  async dlq(@Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '100', 10) || 100, 500);
    const list = await this.outboxService.getDlqList(limitNum);
    return {
      total: list.length,
      events: list.map((e) => ({
        id: Number(e.id),
        eventType: e.eventType,
        scopeType: e.scopeType,
        scopeId: e.scopeId,
        entityType: e.entityType,
        entityId: e.entityId,
        attemptCount: e.attemptCount,
        deadLetteredAt: e.deadLetteredAt?.toISOString?.(),
        createdAt: e.createdAt?.toISOString?.(),
      })),
    };
  }
}
