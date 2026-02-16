import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { existsSync } from 'fs';
import { join } from 'path';
import { getRedisOptions, isRedisEnabled } from './infra/redis/redis.config';
import { RedisIoAdapter } from './infra/redis/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (isRedisEnabled()) {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const Redis = (await import('ioredis')).default;
    const opts = getRedisOptions();
    const pub = opts.url
      ? new Redis(opts.url, { maxRetriesPerRequest: null })
      : new Redis({
          host: opts.host ?? 'localhost',
          port: opts.port ?? 6379,
          password: opts.password,
          maxRetriesPerRequest: null,
        });
    const sub = pub.duplicate();
    const redisAdapter = createAdapter(pub, sub);
    app.useWebSocketAdapter(new RedisIoAdapter(app, redisAdapter));
  } else {
    app.useWebSocketAdapter(new IoAdapter(app));
  }

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);

  // Optional: serve built frontend from ./public (single-port deployment)
  const publicDir = (process.env.STATIC_DIR ?? 'public').trim() || 'public';
  const publicPath = join(process.cwd(), publicDir);
  const indexPath = join(publicPath, 'index.html');
  const hasFrontend = existsSync(indexPath);
  if (hasFrontend) app.useStaticAssets(publicPath);

  // CORS
  // - If you deploy frontend + API on the same port (hasFrontend=true), browser requests can still send the
  //   Origin header and would be rejected if we strictly whitelist localhost. To keep things working for
  //   "test from another PC" scenarios, we allow-all when frontend build is served, unless CORS_ORIGINS is set.
  const originsEnv = (process.env.CORS_ORIGINS ?? '').trim();
  const allowAllOrigins =
    originsEnv === '*' ||
    originsEnv.toLowerCase() === 'true' ||
    (hasFrontend && !originsEnv);

  const allowedOrigins = (originsEnv && originsEnv !== '*'
    ? originsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173']
  ).filter(Boolean);

  app.enableCors({
    origin: allowAllOrigins
      ? true
      : (origin, cb) => {
          // no Origin header (server-to-server / curl) або same-origin
          if (!origin) return cb(null, true);
          if (allowedOrigins.includes(origin)) return cb(null, true);
          return cb(new Error(`CORS blocked for origin: ${origin}`), false);
        },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.APP_PORT) || 3000;
  const host = (process.env.APP_HOST ?? '0.0.0.0').trim() || '0.0.0.0';

  // SPA fallback (only if frontend build exists)
  if (hasFrontend) {
    await app.init();
    const server = app.getHttpAdapter().getInstance();
    /**
     * IMPORTANT:
     * On some dependency stacks (router/path-to-regexp v6+), using string path "*" can crash with:
     *   PathError [TypeError]: Missing parameter name at index 1: *
     * To avoid that, we register the SPA fallback with a RegExp.
     */
    server.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (req: any, res: any) => {
      return res.sendFile(indexPath);
    });
  }

  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`Buduy CRM backend is running on http://${host}:${port}/api`);
}
bootstrap();
