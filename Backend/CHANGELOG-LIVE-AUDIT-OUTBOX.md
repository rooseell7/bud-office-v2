# Changelog: Live Everywhere + Audit + Outbox + Realtime Sync

## Summary

- **Audit**: All write operations log to `audit_log` (same transaction as business change).
- **Outbox**: Realtime events go to `outbox_events` in the same transaction; `OutboxPublisher` emits `bo:invalidate` every ~1s (FOR UPDATE SKIP LOCKED).
- **Realtime**: Clients join `global` on connect; on `bo:invalidate` frontend calls `invalidateAll()` so all list pages refetch (live everywhere).
- **Resync**: After reconnect, `GET /api/realtime/sync?sinceEventId=...&scopeType=global` returns missed events; client applies invalidateAll.
- **clientOpId**: Middleware reads `x-client-op-id` (or body.clientOpId); stored in audit meta and outbox for idempotency (duplicate detection can be added per-CREATE later).

## DB (already applied)

- `audit_log`: id (bigserial), createdAt, actorUserId, action, entityType, entityId, projectId, before, after, meta. Indexes: createdAt, (entityType, entityId), (projectId, createdAt), (actorUserId, createdAt), action.
- `outbox_events`: id (bigserial), createdAt, publishedAt, attemptCount, nextAttemptAt, eventType, scopeType, scopeId, entityType, entityId, payload, actorUserId, clientOpId. Indexes: (publishedAt, nextAttemptAt, createdAt), (scopeType, scopeId, id), (clientOpId).

Migration: `Backend/sql/2026-02-06_audit_log_outbox.sql` (in `run-migrations.mjs`).

## Backend changes

### New / updated files

- **src/common/middleware/client-op-id.middleware.ts** — Reads `x-client-op-id` (UUID), sets `req.clientOpId`. Applied globally in `AppModule`.
- **src/audit/audit.service.ts** — Added `logTx(manager, params)` for same-transaction audit.
- **src/audit/audit-log.entity.ts** — Unchanged (already had correct fields).
- **src/realtime/outbox/outbox.service.ts** — Added `enqueueTx(manager, params)`; `getUnpublished()` uses `setLock('pessimistic_write').setOnLocked('skip_locked')`; `getSince()` for `scopeType=global` no longer filters by scopeId so all global events are returned.
- **src/realtime/realtime-emitter.service.ts** — Added `emitEntityChangedTx(manager, params)` (INSERT outbox in same tx). Kept `emitEntityChanged` / `emitEntityDeleted` for non-tx usage.
- **src/realtime/realtime.controller.ts** — Sync API limit cap 2000.
- **src/objects/object.service.ts** — Create/update/remove use transaction: save → audit.logTx → realtimeEmitter.emitEntityChangedTx → commit. Accept `meta?: { clientOpId }`.
- **src/objects/objects.controller.ts** — Passes `req.clientOpId` to service.
- **src/clients/clients.service.ts** — Same transaction pattern for create/update/remove; audit + outbox in same tx.
- **src/clients/clients.controller.ts** — Passes `req.clientOpId` to service.
- **src/app.module.ts** — `ClientOpIdMiddleware` applied for all routes.

### Pattern for remaining modules (PART F)

For each write (POST/PATCH/PUT/DELETE):

1. Inject `DataSource`, `AuditService`, `RealtimeEmitterService`.
2. Wrap mutation in:
   - `const qr = this.dataSource.createQueryRunner(); await qr.connect(); await qr.startTransaction();`
   - Business save: `await qr.manager.save(Entity, entity)` or `qr.manager.remove(...)`.
   - `await this.auditService.logTx(qr.manager, { actorUserId, action, entityType, entityId, projectId?, after, meta: { clientOpId } });`
   - `await this.realtimeEmitter.emitEntityChangedTx(qr.manager, { scopeType: 'global', eventType: 'entity.created'|'entity.changed'|'entity.deleted', entityType, entityId, projectId?, actorUserId, clientOpId, hint: { module, kind } });`
   - `await qr.commitTransaction();` (in try); on catch `qr.rollbackTransaction();`; finally `qr.release()`.
3. In controller, pass `{ clientOpId: req.clientOpId }` to service.

Entity type names (examples): `object`, `client`, `act`, `invoice`, `order`, `warehouse_movement`, `supply_request`, `supply_receipt`, `document`, `estimate`, `project`, etc.

### Idempotency (PART D, optional)

- clientOpId is stored in audit and outbox. For CREATE idempotency: before creating, check `audit_log` for same `meta->>'clientOpId'` and `actorUserId`; if found, return existing resource (e.g. from a cache or re-query by entityId from that audit row).

### 409 Conflict (PART E, optional)

- Add `version` (int) to entities (e.g. Act, Invoice); on PATCH accept `ifVersion`; if `entity.version !== ifVersion` throw `ConflictException` (409). Frontend: on 409 refetch and show “дані оновлено, перезавантажено”.

## Frontend changes

- **api/api.ts**, **api/client.ts**, **shared/api/apiClient.ts** — Request interceptor: for POST/PATCH/PUT/DELETE set header `x-client-op-id` to `crypto.randomUUID()` (or fallback).
- **realtime/invalidateBus.ts** — Added `subscribeInvalidateAll(handler)`, `invalidateAll()`. On every `bo:invalidate`, both `emitInvalidate(payload)` and `invalidateAll()` are called.
- **realtime/realtimeClient.ts** — On `bo:invalidate`: save `lastEventId` to localStorage, call `emitInvalidate` and `invalidateAll()`.
- **realtime/RealtimeContext.tsx** — Exposes `subscribeInvalidateAll`; on connect runs resync (GET sync?sinceEventId=...) and emits invalidate for each event; updates lastEventId.
- **modules/projects/ProjectsPage.tsx** — Uses `subscribeInvalidateAll(loadObjects)`.
- **modules/clients/ClientsPage.tsx** — Uses `subscribeInvalidateAll(load)`.
- **pages/acts/ActsPage.tsx** — Uses `subscribeInvalidateAll(load)`.

## How to run / test

### DB

```bash
cd Backend
npm run migrate
# or: node tools/run-migrations.mjs
```

### Backend

```bash
cd Backend
npm run build
npm run start:prod
# or dev: npm run start:dev
```

### Frontend

```bash
cd Frontend
npm run build
# or dev: npm run dev
```

### Manual tests (acceptance)

1. **G1 – Live (2 sessions)**  
   Open two browsers (or two incognito tabs). Both go to e.g. `/projects` (objects list) or `/clients` or `/delivery/acts`. In tab A create/update an object (or client/act). Tab B should update the list without F5.

2. **G2 – Cross-module**  
   Tab B on `/supply/orders` (or any list). Tab A changes data in another module (e.g. create act). Tab B list should refresh without F5 (because invalidateAll refetches all subscribed pages).

3. **G3 – Offline + resync**  
   Tab B: disconnect network 20–30 s. Tab A: do 2–3 changes. Tab B: reconnect. After reconnect, sync API is called with `sinceEventId` from localStorage; returned events trigger invalidateAll; data should become current.

4. **G4 – Audit**  
   After any mutation (object/client create/update/delete), check DB: `SELECT * FROM audit_log ORDER BY id DESC LIMIT 5;` — new row with actorUserId, action, entityType, entityId, ts.

5. **G5 – Outbox**  
   Do a mutation, then restart backend before the publisher tick. After restart, within ~1 s outbox_events row should get `publishedAt` set and clients should receive `bo:invalidate`.

## Build confirmation

- Backend: `npm run build` (NestJS) — OK.
- Frontend: `npm run build` (Vite) — OK.
