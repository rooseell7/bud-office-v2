/**
 * STEP 4/5: Editing (soft lock) store — in-memory or Redis for multi-instance.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../infra/redis/redis.service';
import { EditingRedisStoreService } from './editing-redis-store.service';

export type EditingEntry = {
  userId: number;
  name: string;
  initials?: string;
  startedAt: number;
  lastSeenAt: number;
};

const TTL_MS = 90_000;
const CLEANUP_INTERVAL_MS = 15_000;

function key(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

@Injectable()
export class EditingStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly byEntity = new Map<string, EditingEntry[]>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly redisStore: EditingRedisStoreService,
  ) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  begin(entityType: string, entityId: string, userId: number, name: string, initials?: string): void {
    if (this.redis.isEnabled()) {
      this.redisStore.beginAsync(entityType, entityId, userId, name, initials).catch(() => {});
      return;
    }
    const k = key(entityType, entityId);
    const list = this.byEntity.get(k) ?? [];
    const now = Date.now();
    const idx = list.findIndex((e) => e.userId === userId);
    if (idx >= 0) {
      list[idx]!.lastSeenAt = now;
    } else {
      list.push({ userId, name, initials, startedAt: now, lastSeenAt: now });
    }
    this.byEntity.set(k, list);
  }

  async beginAsync(
    entityType: string,
    entityId: string,
    userId: number,
    name: string,
    initials?: string,
  ): Promise<void> {
    if (this.redis.isEnabled()) {
      await this.redisStore.beginAsync(entityType, entityId, userId, name, initials);
      return;
    }
    this.begin(entityType, entityId, userId, name, initials);
  }

  end(entityType: string, entityId: string, userId: number): void {
    if (this.redis.isEnabled()) {
      this.redisStore.endAsync(entityType, entityId, userId).catch(() => {});
      return;
    }
    const k = key(entityType, entityId);
    const list = (this.byEntity.get(k) ?? []).filter((e) => e.userId !== userId);
    if (list.length === 0) this.byEntity.delete(k);
    else this.byEntity.set(k, list);
  }

  async endAsync(entityType: string, entityId: string, userId: number): Promise<void> {
    if (this.redis.isEnabled()) {
      await this.redisStore.endAsync(entityType, entityId, userId);
      return;
    }
    this.end(entityType, entityId, userId);
  }

  heartbeat(entityType: string, entityId: string, userId: number): void {
    if (this.redis.isEnabled()) {
      this.redisStore.heartbeatAsync(entityType, entityId, userId).catch(() => {});
      return;
    }
    const k = key(entityType, entityId);
    const list = this.byEntity.get(k) ?? [];
    const entry = list.find((e) => e.userId === userId);
    if (entry) entry.lastSeenAt = Date.now();
  }

  getState(entityType: string, entityId: string): EditingEntry[] {
    if (this.redis.isEnabled()) return [];
    const k = key(entityType, entityId);
    const now = Date.now();
    const list = (this.byEntity.get(k) ?? []).filter((e) => now - e.lastSeenAt < TTL_MS);
    if (list.length === 0) this.byEntity.delete(k);
    else this.byEntity.set(k, list);
    return list;
  }

  async getStateAsync(entityType: string, entityId: string): Promise<EditingEntry[]> {
    if (this.redis.isEnabled()) return this.redisStore.getStateAsync(entityType, entityId);
    return Promise.resolve(this.getState(entityType, entityId));
  }

  private cleanup(): void {
    if (this.redis.isEnabled()) return;
    const now = Date.now();
    for (const [k, list] of this.byEntity) {
      const alive = list.filter((e) => now - e.lastSeenAt < TTL_MS);
      if (alive.length === 0) this.byEntity.delete(k);
      else this.byEntity.set(k, alive);
    }
  }
}
