import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Server } from 'socket.io';
import { DataSource } from 'typeorm';
import { OutboxEvent } from './outbox-event.entity';
import { OutboxService } from './outbox.service';
import { RealtimeService } from '../realtime.service';

const INVALIDATE_EVENT = 'bo:invalidate';
const NOTIFY_EVENT = 'bo:notify';
const BATCH_SIZE = 200;
const INTERVAL_MS = 1000;
const MAX_ATTEMPTS_BEFORE_DLQ = 10;

function backoffSeconds(attemptCount: number): number {
  if (attemptCount <= 1) return 2;
  if (attemptCount === 2) return 5;
  if (attemptCount === 3) return 15;
  return 60;
}

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly realtimeService: RealtimeService,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.intervalId = setInterval(() => this.tick(), INTERVAL_MS);
    this.logger.log('Outbox publisher started');
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getServer(): Server | null {
    return (this.realtimeService as any).server ?? null;
  }

  private async tick(): Promise<void> {
    const server = this.getServer();
    if (!server) return;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    let rows: OutboxEvent[];
    try {
      rows = await this.outboxService.getUnpublishedTx(qr.manager, BATCH_SIZE);
    } catch (e) {
      await qr.rollbackTransaction();
      this.logger.warn(`Outbox fetch failed: ${(e as Error).message}`);
      await qr.release();
      return;
    }

    let published = 0;
    let failed = 0;
    let dlq = 0;
    for (const row of rows) {
      try {
        const rooms: string[] = [];
        if (row.scopeType === 'global') {
          rooms.push('global');
        } else if (row.scopeType === 'project' && row.scopeId != null) {
          rooms.push(`project:${row.scopeId}`);
        } else if (row.scopeType === 'user' && row.scopeId != null) {
          rooms.push(`user:${row.scopeId}`);
        }

        const serverTs = new Date().toISOString();
        const payload = {
          v: 1,
          eventId: Number(row.id),
          eventType: row.eventType,
          scopeType: row.scopeType,
          scopeId: row.scopeId ?? undefined,
          entityType: row.entityType,
          entityId: row.entityId,
          projectId: row.payload?.projectId ?? (row.scopeType === 'project' ? row.scopeId : null),
          entityVersion: row.payload?.entityVersion ?? undefined,
          updatedAt: row.payload?.updatedAt ?? undefined,
          serverTs,
          actorUserId: row.actorUserId ?? undefined,
          clientOpId: row.clientOpId ?? undefined,
          invalidate: row.payload?.invalidate ?? undefined,
          patch: row.payload?.patch ?? undefined,
          ts: row.createdAt?.toISOString?.() ?? serverTs,
        };

        if (row.eventType === 'notify') {
          for (const room of rooms) {
            server.to(room).emit(NOTIFY_EVENT, {
              notificationId: row.payload?.notificationId,
              type: row.payload?.type,
              title: row.payload?.title,
              projectId: row.payload?.projectId,
              entity: row.payload?.entity,
              createdAt: row.payload?.createdAt ?? row.createdAt?.toISOString?.(),
            });
          }
        } else {
          for (const room of rooms) {
            server.to(room).emit(INVALIDATE_EVENT, payload);
          }
        }
        await this.outboxService.markPublishedTx(qr.manager, row.id);
        published++;
      } catch (e) {
        const nextAttempt = row.attemptCount + 1;
        if (nextAttempt >= MAX_ATTEMPTS_BEFORE_DLQ) {
          await this.outboxService.markDeadLetteredTx(qr.manager, row.id);
          dlq++;
          this.logger.error(
            `[outbox] DLQ id=${row.id} eventType=${row.eventType} attempts=${nextAttempt} err=${(e as Error).message}`,
          );
        } else {
          const next = new Date(Date.now() + backoffSeconds(row.attemptCount) * 1000);
          await this.outboxService.markFailedTx(qr.manager, row.id, next);
          failed++;
          this.logger.warn(`Outbox publish failed id=${row.id}: ${(e as Error).message}`);
        }
      }
    }

    if (published > 0 || failed > 0 || dlq > 0) {
      this.logger.log(
        `[outbox] batch summary published=${published} failed=${failed} dlq=${dlq}`,
      );
    }

    await qr.commitTransaction();
    await qr.release();
  }
}
