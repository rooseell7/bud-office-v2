# STEP 5 — Scale & Reliability

## Summary

- **Redis** as shared memory for presence, editing state, Socket.IO adapter, and distributed locks.
- **Multi-instance** Socket.IO via Redis adapter; presence and outbox work across instances.
- **Outbox** with FOR UPDATE SKIP LOCKED and DLQ (dead-letter after 10 attempts).
- **Distributed locks** (Redis SET NX EX) for critical writes (e.g. invoice numbers).
- **Observability**: health and metrics endpoints, structured logs.

## ENV / .env.example

```env
# Redis (optional for single-instance; required for multi-instance)
REDIS_URL=redis://localhost:6379
# or:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Files added/updated

### Infra

- `src/infra/redis/redis.config.ts` — `getRedisOptions()`, `isRedisEnabled()`
- `src/infra/redis/redis.service.ts` — ioredis client, reconnect, graceful shutdown, `getClient()`, `getSubClient()`, `getPubClient()`, `ping()`
- `src/infra/redis/redis.module.ts` — global module, exports RedisService + LockService
- `src/infra/redis/redis-io.adapter.ts` — custom IoAdapter that uses Socket.IO Redis adapter when Redis is enabled
- `src/infra/locks/lock.service.ts` — `withLock(key, ttlMs, fn)`, key helpers: `LockService.projectInvoiceNumber()`, `warehouseMovement()`, `entityApprove()`

### Presence / Editing

- `src/presence/presence-redis-store.service.ts` — Redis keys: `bo:presence:socket:*`, `bo:presence:user:*`, `bo:presence:scope:*`, `bo:presence:ctx:*`; TTL 90s socket, 120s ctx
- `src/presence/editing-redis-store.service.ts` — Redis key `bo:edit:entity:{type}:{id}` (hash), TTL 90s
- `src/presence/presence-store.service.ts` — facade: in-memory when Redis disabled, Redis store when enabled (async API)
- `src/presence/editing-store.service.ts` — same facade for editing state

### Realtime

- `src/main.ts` — when `isRedisEnabled()`, creates ioredis pub/sub and `createAdapter(pub, sub)`, uses `RedisIoAdapter(app, redisAdapter)`
- `src/realtime/realtime.controller.ts` — health (db, redis, wsAdapter, outboxPending, dlqCount, presenceGlobal), metrics (ws_clients_total, presence_global_count, outbox_*), GET `/api/realtime/dlq`
- `src/realtime/outbox/outbox.service.ts` — `getDlqCount()`, `getDlqList(limit)`
- Outbox publisher: structured log batch summary (published/failed/dlq)

### Frontend

- `realtimeClient.ts` — heartbeat 25s when visible, 60s when tab hidden (`visibilitychange`); Offline state already shown in MainLayout

## Nginx (Socket.IO + multi-instance)

Use **sticky sessions** (e.g. `ip_hash`) for `/socket.io/` so that the same client hits the same backend instance when possible (reduces reconnects). Room emits still work across instances via Redis adapter.

Example upstream and location:

```nginx
upstream backend {
    ip_hash;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- `ip_hash` ensures the same client IP is routed to the same server, which helps Socket.IO stick to one instance.
- With Redis adapter, `server.to(room).emit()` is broadcast across all instances, so room membership works even when clients are on different instances.

## Multi-instance test

1. Set `REDIS_URL` or `REDIS_HOST` so Redis and the Socket.IO Redis adapter are active.
2. Run two backends on different ports (e.g. 3000 and 3001).
3. Put Nginx (or similar) in front with `ip_hash` and proxy `/api/` and `/socket.io/` to the upstream.
4. Connect client 1 (e.g. from one browser) and client 2 (e.g. another browser/incognito); they may land on different instances.
5. Verify: outbox events and presence (e.g. “who’s online”) appear on both; room emits (e.g. `project:123`) are received by clients in that room regardless of which instance they are on.

## Acceptance (short)

- **G1** Multi-instance: two backends behind Nginx; outbox/presence and room emits work across instances.
- **G2** Presence: one user two tabs → one online; close one tab → still online; close all → offline.
- **G3** Outbox: WS down → pending grows; WS up → catch-up; after 10 failed attempts → DLQ.
- **G4** Locks: e.g. parallel invoice number requests → no duplicate numbers when using `LockService.withLock(LockService.projectInvoiceNumber(projectId), 5000, async () => { ... })`.
- **G5** Health and metrics endpoints return real values (db, redis, ws, outbox, presence, dlq).
