import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../infra/redis/redis.service';
import { PresenceRedisStoreService } from './presence-redis-store.service';

/**
 * STEP 4/5: Presence store — in-memory (single instance) or Redis (multi-instance).
 * When Redis is enabled, delegates to PresenceRedisStoreService; otherwise in-memory with TTL 90s.
 */

export type PresenceContext = {
  module?: string | null;
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  mode?: 'view' | 'edit';
};

export type PresenceRecord = {
  userId: number;
  name: string;
  initials: string;
  role?: string | null;
  socketId: string;
  lastSeenAt: number;
  context: PresenceContext;
};

const TTL_MS = 90_000;
const CLEANUP_INTERVAL_MS = 15_000;

@Injectable()
export class PresenceStoreService implements OnModuleDestroy {
  private readonly bySocket = new Map<string, PresenceRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly redisStore: PresenceRedisStoreService,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Sync set for backward compat; prefer setAsync when using Redis. */
  set(socketId: string, record: Omit<PresenceRecord, 'lastSeenAt'>): void {
    if (this.redis.isEnabled()) {
      this.redisStore.setAsync(socketId, record).catch(() => {});
      return;
    }
    this.bySocket.set(socketId, {
      ...record,
      lastSeenAt: Date.now(),
    });
  }

  async setAsync(socketId: string, record: Omit<PresenceRecord, 'lastSeenAt'>): Promise<void> {
    if (this.redis.isEnabled()) {
      await this.redisStore.setAsync(socketId, record);
      return;
    }
    this.bySocket.set(socketId, {
      ...record,
      lastSeenAt: Date.now(),
    });
  }

  heartbeat(socketId: string): void {
    if (this.redis.isEnabled()) {
      this.redisStore.heartbeatAsync(socketId).catch(() => {});
      return;
    }
    const r = this.bySocket.get(socketId);
    if (r) r.lastSeenAt = Date.now();
  }

  remove(socketId: string): PresenceRecord | undefined {
    if (this.redis.isEnabled()) {
      this.redisStore.removeAsync(socketId).catch(() => {});
      return undefined;
    }
    const r = this.bySocket.get(socketId);
    this.bySocket.delete(socketId);
    return r;
  }

  async removeAsync(socketId: string): Promise<PresenceRecord | undefined> {
    if (this.redis.isEnabled()) {
      return this.redisStore.removeAsync(socketId);
    }
    const r = this.bySocket.get(socketId);
    this.bySocket.delete(socketId);
    return r;
  }

  get(socketId: string): PresenceRecord | undefined {
    if (!this.redis.isEnabled()) return this.bySocket.get(socketId);
    return undefined;
  }

  getAll(): PresenceRecord[] {
    if (this.redis.isEnabled()) return [];
    const now = Date.now();
    return [...this.bySocket.values()].filter((r) => now - r.lastSeenAt < TTL_MS);
  }

  getGlobal(): PresenceRecord[] {
    return this.getAll();
  }

  getByProject(projectId: number): PresenceRecord[] {
    return this.getAll().filter((r) => r.context.projectId === projectId);
  }

  getByEntity(entityType: string, entityId: string): PresenceRecord[] {
    return this.getAll().filter(
      (r) => r.context.entityType === entityType && r.context.entityId === String(entityId),
    );
  }

  async getGlobalAsync(): Promise<PresenceRecord[]> {
    if (this.redis.isEnabled()) return this.redisStore.getGlobalAsync();
    return Promise.resolve(this.getGlobal());
  }

  async getByProjectAsync(projectId: number): Promise<PresenceRecord[]> {
    if (this.redis.isEnabled()) return this.redisStore.getByProjectAsync(projectId);
    return Promise.resolve(this.getByProject(projectId));
  }

  async getByEntityAsync(entityType: string, entityId: string): Promise<PresenceRecord[]> {
    if (this.redis.isEnabled()) return this.redisStore.getByEntityAsync(entityType, entityId);
    return Promise.resolve(this.getByEntity(entityType, entityId));
  }

  private cleanup(): void {
    if (this.redis.isEnabled()) return;
    const now = Date.now();
    for (const [socketId, r] of this.bySocket) {
      if (now - r.lastSeenAt >= TTL_MS) this.bySocket.delete(socketId);
    }
  }
}
