/**
 * STEP 5: Presence store in Redis for multi-instance.
 * Keys: bo:presence:socket:{id}, bo:presence:user:{userId}, bo:presence:scope:global|project:{id}|entity:{type}:{id}, bo:presence:ctx:{userId}.
 * TTL socket 90s, ctx 120s; heartbeat refreshes TTL.
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../infra/redis/redis.service';
import type { PresenceContext, PresenceRecord } from './presence-store.service';

const PREFIX = 'bo:presence:';
const SOCKET_TTL = 90;
const CTX_TTL = 120;

function socketKey(socketId: string): string {
  return `${PREFIX}socket:${socketId}`;
}
function userKey(userId: number): string {
  return `${PREFIX}user:${userId}`;
}
function scopeGlobalKey(): string {
  return `${PREFIX}scope:global`;
}
function scopeProjectKey(projectId: number): string {
  return `${PREFIX}scope:project:${projectId}`;
}
function scopeEntityKey(entityType: string, entityId: string): string {
  return `${PREFIX}scope:entity:${entityType}:${entityId}`;
}
function ctxKey(userId: number): string {
  return `${PREFIX}ctx:${userId}`;
}

@Injectable()
export class PresenceRedisStoreService {
  constructor(private readonly redis: RedisService) {}

  private client(): any {
    return this.redis.getClient();
  }

  async setAsync(socketId: string, record: Omit<PresenceRecord, 'lastSeenAt'>): Promise<void> {
    const client = this.client();
    if (!client) return;
    const rec: PresenceRecord = { ...record, lastSeenAt: Date.now() };
    const key = socketKey(socketId);
    await client.setex(key, SOCKET_TTL, JSON.stringify(rec));
    await client.sadd(userKey(record.userId), socketId);
    await client.sadd(scopeGlobalKey(), String(record.userId));
    if (record.context.projectId != null) {
      await client.sadd(scopeProjectKey(record.context.projectId), String(record.userId));
    }
    if (record.context.entityType && record.context.entityId) {
      await client.sadd(scopeEntityKey(record.context.entityType, record.context.entityId), String(record.userId));
    }
    await client.setex(ctxKey(record.userId), CTX_TTL, JSON.stringify(record.context));
  }

  async heartbeatAsync(socketId: string): Promise<void> {
    const client = this.client();
    if (!client) return;
    await client.expire(socketKey(socketId), SOCKET_TTL);
  }

  async removeAsync(socketId: string): Promise<PresenceRecord | undefined> {
    const client = this.client();
    if (!client) return undefined;
    const key = socketKey(socketId);
    const raw = await client.get(key);
    if (!raw) return undefined;
    let record: PresenceRecord;
    try {
      record = JSON.parse(raw) as PresenceRecord;
    } catch {
      await client.del(key);
      return undefined;
    }
    await client.del(key);
    await client.srem(userKey(record.userId), socketId);
    const count = await client.scard(userKey(record.userId));
    if (count === 0) {
      await client.srem(scopeGlobalKey(), String(record.userId));
      if (record.context.projectId != null) {
        await client.srem(scopeProjectKey(record.context.projectId), String(record.userId));
      }
      if (record.context.entityType && record.context.entityId) {
        await client.srem(scopeEntityKey(record.context.entityType, record.context.entityId), String(record.userId));
      }
      await client.del(ctxKey(record.userId));
    }
    return record;
  }

  async getAsync(socketId: string): Promise<PresenceRecord | undefined> {
    const client = this.client();
    if (!client) return undefined;
    const raw = await client.get(socketKey(socketId));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as PresenceRecord;
    } catch {
      return undefined;
    }
  }

  async getGlobalAsync(): Promise<PresenceRecord[]> {
    return this.getRecordsFromScopeSet(scopeGlobalKey(), undefined, undefined);
  }

  async getByProjectAsync(projectId: number): Promise<PresenceRecord[]> {
    return this.getRecordsFromScopeSet(scopeProjectKey(projectId), projectId, undefined);
  }

  async getByEntityAsync(entityType: string, entityId: string): Promise<PresenceRecord[]> {
    return this.getRecordsFromScopeSet(scopeEntityKey(entityType, entityId), undefined, { entityType, entityId });
  }

  private async getRecordsFromScopeSet(
    setKey: string,
    projectId?: number,
    entity?: { entityType: string; entityId: string },
  ): Promise<PresenceRecord[]> {
    const client = this.client();
    if (!client) return [];
    const userIds = await client.smembers(setKey);
    const out: PresenceRecord[] = [];
    for (const uidStr of userIds) {
      const userId = parseInt(uidStr, 10);
      if (!Number.isFinite(userId)) continue;
      const socketIds = await client.smembers(userKey(userId));
      let record: PresenceRecord | undefined;
      for (const sid of socketIds) {
        const raw = await client.get(socketKey(sid));
        if (raw) {
          try {
            record = JSON.parse(raw) as PresenceRecord;
            break;
          } catch {
            /* skip */
          }
        }
      }
      if (!record) {
        await client.srem(setKey, uidStr);
        continue;
      }
      if (projectId != null && record.context.projectId !== projectId) continue;
      if (entity && (record.context.entityType !== entity.entityType || record.context.entityId !== entity.entityId))
        continue;
      out.push(record);
    }
    return out;
  }
}
