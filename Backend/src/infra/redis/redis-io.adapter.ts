/**
 * STEP 5: Socket.IO adapter that uses Redis adapter for multi-instance room emits.
 * Use when REDIS_URL / REDIS_HOST is set; create Redis pub/sub clients and pass adapter to constructor.
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly redisAdapter: any,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const opts = { ...options, adapter: this.redisAdapter };
    return super.createIOServer(port, opts);
  }
}
