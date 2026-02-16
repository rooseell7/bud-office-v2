# Changelog: STEP 3 — Patch-based Live + Outbox hygiene + Health

## Summary

- **Payload v1**: Outbox events now emit `v: 1`, `eventId`, `serverTs`, `entityVersion`, `updatedAt`, `patch` (op + fields/snapshot).
- **Patch engine (frontend)**: Applies merge/delete/create to React Query cache when possible; fallback to targeted invalidate or invalidateAll.
- **Outbox hygiene**: Retention job deletes published events older than 7 days; DLQ after 10 failed attempts (`deadLetteredAt`).
- **Health**: `GET /api/realtime/health` returns outboxPending, oldestPendingSeconds, publisherRunning, wsClients, wsRooms.

## Backend

### New files

- **sql/2026-02-07_outbox_dead_letter_retention.sql** — Adds `deadLetteredAt` to outbox_events.
- **src/realtime/outbox/outbox-hygiene.service.ts** — Retention job (every 1h, delete published &gt; 7 days).

### Updated files

- **src/realtime/outbox/outbox-event.entity.ts** — `deadLetteredAt` column.
- **src/realtime/outbox/outbox.service.ts** — `getUnpublishedTx` excludes `deadLetteredAt IS NOT NULL` and `attemptCount >= 10`; `markDeadLetteredTx`, `getPendingCount`, `getOldestPendingSeconds`, `deletePublishedOlderThan`.
- **src/realtime/outbox/outbox.publisher.ts** — Payload v1 (v, eventId, serverTs, entityVersion, updatedAt, patch); on 10th failure calls `markDeadLetteredTx` instead of retry.
- **src/realtime/realtime-emitter.service.ts** — `EmitEntityChangedTxParams` accepts `entityVersion`, `updatedAt`, `patch`; stored in payload.
- **src/realtime/invalidate-hints.ts** — `buildPatchForEntity(entityType, action, entity)` returns `{ op, fields?, snapshot? }` for act, invoice, order.
- **src/realtime/realtime.service.ts** — `getServer`, `getPublisherRunning`, `setPublisherRunning`, `getWsClientsCount`, `getWsRoomsCount`.
- **src/realtime/realtime.controller.ts** — `GET /realtime/health` (no auth) returns outboxPending, oldestPendingSeconds, publisherRunning, wsClients, wsRooms.
- **src/realtime/realtime.module.ts** — Registers `OutboxHygieneService`.
- **tools/run-migrations.mjs** — Added `2026-02-07_outbox_dead_letter_retention.sql`.

## Frontend

### New files

- **src/shared/realtime/patchRegistry.ts** — Registry for act, invoice, order (listQueryKey, detailQueryKey); `applyMergeToList`, `applyMergeToDetail`, `applyDeleteFromList`, `applyCreateToList`.
- **src/shared/realtime/patchEngine.ts** — `applyPatch(queryClient, payload)`: version check, then apply merge/delete/create; returns `{ applied, invalidateKeys }`.

### Updated files

- **src/realtime/invalidateBus.ts** — `InvalidatePayload` extended with `v`, `entityVersion`, `updatedAt`, `serverTs`, `patch`.
- **src/realtime/RealtimeContext.tsx** — `handleInvalidate` calls `applyPatch` first; if not applied, adds to invalidate batch. Sync path also uses `applyPatch` and passes full payload (patch, entityVersion).

## Wiring patch from write flows

To get **patch-based live** (no refetch) for act/invoice/order, the corresponding **write services** must call `emitEntityChangedTx` with:

- `entityVersion`: e.g. from `entity.version` or a counter.
- `updatedAt`: `entity.updatedAt?.toISOString?.()`.
- `patch`: `buildPatchForEntity('act', 'changed', { id: saved.id, status: saved.status, updatedAt: saved.updatedAt, ... })`.

Example (when you add tx pattern to acts.service):

```ts
import { buildPatchForEntity } from '../realtime/invalidate-hints';

await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
  eventType: 'entity.changed',
  entityType: 'act',
  entityId: String(saved.id),
  projectId: saved.projectId,
  actorUserId: userId,
  entityVersion: (saved as any).version ?? undefined,
  updatedAt: saved.updatedAt?.toISOString?.(),
  patch: buildPatchForEntity('act', 'changed', { id: saved.id, status: saved.status, updatedAt: saved.updatedAt, projectId: saved.projectId }),
});
```

Until then, events for act/invoice/order will use **targeted invalidate** (STEP 2) when those modules adopt the tx pattern.

## Testing

1. **Health**: `GET /api/realtime/health` → JSON with outboxPending, oldestPendingSeconds, publisherRunning, wsClients, wsRooms.
2. **Retention**: After 7 days, published outbox rows are deleted (run migration, then wait or trigger job).
3. **DLQ**: Force 10 publish failures for one event → row gets `deadLetteredAt` set, no more retries.
4. **Patch**: When a write flow sends `patch` + `entityVersion`, open two tabs on the same list; change in one tab should update the other without full refetch (when React Query is used for that list and `setQueryClient` is set).

## Build

- Backend: `npm run build` ✅
- Frontend: `npm run build` ✅

## Migration

```bash
cd Backend && npm run migrate
```

This applies `2026-02-07_outbox_dead_letter_retention.sql`.
