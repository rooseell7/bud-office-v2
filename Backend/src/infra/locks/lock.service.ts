/**
 * STEP 5: Distributed lock (Redis SET NX EX) for critical write operations.
 * Keys: lock:project:{id}:invoiceNumber, lock:warehouse:{id}:movement, lock:entity:{type}:{id}:approve
 * Use withLock(key, ttlMs, fn) — only around short critical sections.
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const LUA_RELEASE = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class LockService {
  constructor(private readonly redis: RedisService) {}

  private client(): any {
    return this.redis.getClient();
  }

  /**
   * Run fn with a distributed lock. If Redis is disabled, runs fn without locking.
   * @param key e.g. lock:project:123:invoiceNumber
   * @param ttlMs lock TTL in ms (avoid deadlock if process crashes)
   * @param fn critical section
   * @returns result of fn, or throws if lock could not be acquired
   */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const client = this.client();
    if (!client || !this.redis.isEnabled()) {
      return fn();
    }
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const acquired = await client.set(key, token, 'PX', ttlMs, 'NX');
    if (!acquired) {
      throw new Error(`Lock not acquired: ${key}`);
    }
    try {
      const result = await fn();
      return result;
    } finally {
      try {
        await client.eval(LUA_RELEASE, 1, key, token);
      } catch {
        /* lock will expire */
      }
    }
  }

  /** Key helpers per spec. */
  static projectInvoiceNumber(projectId: number): string {
    return `lock:project:${projectId}:invoiceNumber`;
  }

  static warehouseMovement(warehouseId: number): string {
    return `lock:warehouse:${warehouseId}:movement`;
  }

  static entityApprove(entityType: string, entityId: string): string {
    return `lock:entity:${entityType}:${entityId}:approve`;
  }
}
