import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEvent } from './outbox-event.entity';

export type ScopeType = 'global' | 'project' | 'user';

export type EnqueueParams = {
  eventType: string;
  scopeType: ScopeType;
  scopeId?: number | null;
  entityType: string;
  entityId: string | number;
  payload?: Record<string, unknown>;
  actorUserId?: number | null;
  clientOpId?: string | null;
};

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repo: Repository<OutboxEvent>,
  ) {}

  async enqueue(params: EnqueueParams): Promise<OutboxEvent> {
    const row = this.repo.create({
      eventType: params.eventType,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
      entityType: params.entityType,
      entityId: String(params.entityId),
      payload: params.payload ?? {},
      actorUserId: params.actorUserId ?? null,
      clientOpId: params.clientOpId ?? null,
    });
    return this.repo.save(row);
  }

  /** Enqueue within existing transaction (same manager as business + audit). */
  async enqueueTx(manager: EntityManager, params: EnqueueParams): Promise<void> {
    const repo = manager.getRepository(OutboxEvent);
    const row = repo.create({
      eventType: params.eventType,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
      entityType: params.entityType,
      entityId: String(params.entityId),
      payload: params.payload ?? {},
      actorUserId: params.actorUserId ?? null,
      clientOpId: params.clientOpId ?? null,
    });
    await repo.save(row);
  }

  private static readonly MAX_ATTEMPTS_BEFORE_DLQ = 10;

  /**
   * Fetch unpublished events inside a transaction (required for FOR UPDATE SKIP LOCKED).
   * Excludes dead-lettered and events that exceeded max attempts.
   */
  async getUnpublishedTx(manager: EntityManager, limit: number): Promise<OutboxEvent[]> {
    const now = new Date();
    return manager
      .getRepository(OutboxEvent)
      .createQueryBuilder('e')
      .setLock('pessimistic_write', undefined, ['e'])
      .setOnLocked('skip_locked')
      .where('e.publishedAt IS NULL')
      .andWhere('e.deadLetteredAt IS NULL')
      .andWhere('e.attemptCount < :maxAttempts', { maxAttempts: OutboxService.MAX_ATTEMPTS_BEFORE_DLQ })
      .andWhere('(e.nextAttemptAt IS NULL OR e.nextAttemptAt <= :now)', { now })
      .orderBy('e.id', 'ASC')
      .take(limit)
      .getMany();
  }

  async markPublished(id: string): Promise<void> {
    await this.repo.update(id, { publishedAt: new Date() });
  }

  /** Mark published within same transaction as getUnpublishedTx. */
  async markPublishedTx(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(OutboxEvent).update(id, { publishedAt: new Date() });
  }

  async markFailed(id: string, nextAttemptAt: Date): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({
        attemptCount: () => 'attempt_count + 1',
        nextAttemptAt,
      })
      .where('id = :id', { id })
      .execute();
  }

  /** Mark failed within same transaction as getUnpublishedTx. */
  async markFailedTx(manager: EntityManager, id: string, nextAttemptAt: Date): Promise<void> {
    await manager
      .getRepository(OutboxEvent)
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({
        attemptCount: () => 'attempt_count + 1',
        nextAttemptAt,
      })
      .where('id = :id', { id })
      .execute();
  }

  /** Mark as dead-letter (stop retrying). */
  async markDeadLetteredTx(manager: EntityManager, id: string): Promise<void> {
    await manager
      .getRepository(OutboxEvent)
      .update(id, { deadLetteredAt: new Date() });
  }

  /** Count dead-lettered events (for health/metrics). */
  async getDlqCount(): Promise<number> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.deadLetteredAt IS NOT NULL')
      .getCount();
  }

  /** List DLQ entries for admin (optional). */
  async getDlqList(limit: number): Promise<OutboxEvent[]> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.deadLetteredAt IS NOT NULL')
      .orderBy('e.deadLetteredAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /** Count pending (unpublished, not dead-lettered). */
  async getPendingCount(): Promise<number> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.publishedAt IS NULL')
      .andWhere('e.deadLetteredAt IS NULL')
      .andWhere('e.attemptCount < :maxAttempts', { maxAttempts: OutboxService.MAX_ATTEMPTS_BEFORE_DLQ })
      .getCount();
  }

  /** Age in seconds of oldest pending event. */
  async getOldestPendingSeconds(): Promise<number | null> {
    const row = await this.repo
      .createQueryBuilder('e')
      .select('MIN(EXTRACT(EPOCH FROM (now() - e.createdAt)))', 'age')
      .where('e.publishedAt IS NULL')
      .andWhere('e.deadLetteredAt IS NULL')
      .andWhere('e.attemptCount < :maxAttempts', { maxAttempts: OutboxService.MAX_ATTEMPTS_BEFORE_DLQ })
      .getRawOne<{ age: string | null }>();
    const age = row?.age;
    return age != null ? Math.floor(parseFloat(age)) : null;
  }

  /** Delete published events older than retentionDays (retention job). */
  async deletePublishedOlderThan(retentionDays: number): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(OutboxEvent)
      .where('publishedAt IS NOT NULL')
      .andWhere('publishedAt < :cutoff', {
        cutoff: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000),
      })
      .execute();
    return result.affected ?? 0;
  }

  async getSince(sinceId: number, scopeType: string, scopeId: number | null, limit: number): Promise<OutboxEvent[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.id > :sinceId', { sinceId })
      .andWhere('e.publishedAt IS NOT NULL')
      .andWhere('e.scopeType = :scopeType', { scopeType })
      .orderBy('e.id', 'ASC')
      .take(limit);
    if (scopeType !== 'global' && scopeId != null) {
      qb.andWhere('e.scopeId = :scopeId', { scopeId });
    } else if (scopeType !== 'global') {
      qb.andWhere('e.scopeId IS NULL');
    }
    return qb.getMany();
  }
}
