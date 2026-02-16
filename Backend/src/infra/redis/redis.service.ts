/**
 * STEP 5: Redis client (ioredis) with reconnect, timeout, graceful shutdown.
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getRedisOptions, isRedisEnabled } from './redis.config';

const CONNECT_TIMEOUT = 10_000;
const COMMAND_TIMEOUT = 5_000;
const RECONNECT_MS = 2_000;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any = null;
  private subClient: any = null;

  async onModuleInit(): Promise<void> {
    if (!isRedisEnabled()) {
      this.logger.log('Redis disabled (no REDIS_URL / REDIS_HOST)');
      return;
    }
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const Redis = (await import('ioredis')).default;
      const opts = getRedisOptions();
      const options: any = {
        connectTimeout: CONNECT_TIMEOUT,
        retryStrategy: (times: number) => {
          if (times > 20) return null;
          this.logger.warn(`Redis retry ${times}, reconnecting in ${RECONNECT_MS}ms`);
          return RECONNECT_MS;
        },
      };
      if (opts.url) {
        this.client = new Redis(opts.url, options);
      } else {
        options.host = opts.host ?? 'localhost';
        options.port = opts.port ?? 6379;
        if (opts.password) options.password = opts.password;
        this.client = new Redis(options);
      }
      this.subClient = this.client.duplicate();
      this.client.on('error', (err: Error) => this.logger.error(`Redis error: ${err.message}`));
      this.client.on('connect', () => this.logger.log('Redis connected'));
      this.subClient.on('error', (err: Error) => this.logger.error(`Redis sub error: ${err.message}`));
    } catch (e) {
      this.logger.error(`Redis connect failed: ${(e as Error).message}`);
      throw e;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.subClient) {
      try {
        await this.subClient.quit();
      } catch {
        this.subClient.disconnect();
      }
      this.subClient = null;
    }
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
    }
    this.logger.log('Redis disconnected');
  }

  isEnabled(): boolean {
    return isRedisEnabled() && this.client != null;
  }

  /** Main client (for get/set/locks). Do not use for long-lived pub/sub in same process as adapter. */
  getClient(): any {
    return this.client;
  }

  /** Separate client for Socket.IO adapter subscribe. */
  getSubClient(): any {
    return this.subClient;
  }

  /** Duplicate for adapter pub (adapter needs separate pub/sub). */
  async getPubClient(): Promise<any> {
    if (!this.client) return null;
    const Redis = await import('ioredis');
    return this.client.duplicate();
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const p = await this.client.ping();
      return p === 'PONG';
    } catch {
      return false;
    }
  }
}
