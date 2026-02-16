/**
 * STEP 5: Editing (soft lock) store in Redis for multi-instance.
 * Key: bo:edit:entity:{entityType}:{entityId} → Hash (userId -> JSON entry). TTL 90s.
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../infra/redis/redis.service';
import type { EditingEntry } from './editing-store.service';

const PREFIX = 'bo:edit:entity:';
const TTL = 90;

function editKey(entityType: string, entityId: string): string {
  return `${PREFIX}${entityType}:${entityId}`;
}

@Injectable()
export class EditingRedisStoreService {
  constructor(private readonly redis: RedisService) {}

  private client(): any {
    return this.redis.getClient();
  }

  async beginAsync(
    entityType: string,
    entityId: string,
    userId: number,
    name: string,
    initials?: string,
  ): Promise<void> {
    const client = this.client();
    if (!client) return;
    const k = editKey(entityType, entityId);
    const now = Date.now();
    const entry: EditingEntry = { userId, name, initials, startedAt: now, lastSeenAt: now };
    await client.hset(k, String(userId), JSON.stringify(entry));
    await client.expire(k, TTL);
  }

  async endAsync(entityType: string, entityId: string, userId: number): Promise<void> {
    const client = this.client();
    if (!client) return;
    await client.hdel(editKey(entityType, entityId), String(userId));
  }

  async heartbeatAsync(entityType: string, entityId: string, userId: number): Promise<void> {
    const client = this.client();
    if (!client) return;
    const k = editKey(entityType, entityId);
    const raw = await client.hget(k, String(userId));
    if (!raw) return;
    try {
      const entry = JSON.parse(raw) as EditingEntry;
      entry.lastSeenAt = Date.now();
      await client.hset(k, String(userId), JSON.stringify(entry));
      await client.expire(k, TTL);
    } catch {
      /* ignore */
    }
  }

  async getStateAsync(entityType: string, entityId: string): Promise<EditingEntry[]> {
    const client = this.client();
    if (!client) return [];
    const k = editKey(entityType, entityId);
    const map = await client.hgetall(k);
    if (!map || typeof map !== 'object') return [];
    const now = Date.now();
    const out: EditingEntry[] = [];
    for (const v of Object.values(map)) {
      if (typeof v !== 'string') continue;
      try {
        const e = JSON.parse(v) as EditingEntry;
        if (now - e.lastSeenAt < TTL * 1000) out.push(e);
      } catch {
        /* skip */
      }
    }
    return out;
  }
}
