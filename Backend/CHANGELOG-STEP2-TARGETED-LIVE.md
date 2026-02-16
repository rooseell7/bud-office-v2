# Changelog: STEP 2 — Targeted Live Updates

## Summary

Перехід від `invalidateAll()` до точкового invalidate по модулях/сутностях:
- Backend автоматично визначає `scopeType` (project якщо є projectId, інакше global)
- Backend генерує `invalidate` hints (module + queries) з `invalidate-hints.ts`
- Frontend використовує batch + debounce (200ms) для зменшення кількості запитів
- Fallback на `invalidateAll()` якщо hints відсутні

## Backend changes

### New files

- **src/realtime/invalidate-hints.ts** — Канонічний мапінг `entityType` → `{ module, queries }`. Покриває: supply (invoices, orders, receipts, requests, payables, materials), estimate (acts, quotes, stages), warehouses (movements, warehouses), sales (clients, projects, deals), delivery (worklogs, acts), finance (transactions, wallets), common (documents).

### Updated files

- **src/realtime/realtime-emitter.service.ts**:
  - Автоматичне визначення `scopeType`: якщо `projectId` є → `scopeType='project'`, `scopeId=projectId`; інакше → `scopeType='global'`
  - Автоматична генерація `invalidate` hints через `buildInvalidateHints()`
  - Payload тепер містить `invalidate: { module, queries }` замість `hint`

- **src/realtime/outbox/outbox.publisher.ts**:
  - Payload тепер містить `invalidate` замість `hint`

- **src/objects/object.service.ts**, **src/clients/clients.service.ts**:
  - Видалено ручне встановлення `scopeType` та `hint` — тепер автоматично

## Frontend changes

### New files

- **src/shared/realtime/queryKeys.ts** — Канонічні query keys (константи + функції для detail queries)
- **src/shared/realtime/invalidate.ts** — Мапінг canonical keys → React Query `invalidateQueries()` з предикатами. Fallback на `invalidateQueries()` без фільтра якщо key невідомий.

### Updated files

- **src/realtime/invalidateBus.ts**:
  - `InvalidatePayload` тепер має `invalidate?: { module, queries }` (замість `hint`)
  - Залишено `hint` для backward compatibility

- **src/realtime/realtimeClient.ts**:
  - `invalidateAll()` викликається тільки якщо нема `invalidate.queries` (fallback)

- **src/realtime/RealtimeContext.tsx**:
  - Batch + debounce (200ms) для `invalidate.queries`
  - `handleInvalidate()` збирає keys у `Set`, потім `flushInvalidateBatch()` викликає `invalidateBatch(queryClient, keys)`
  - Якщо React Query недоступний → fallback на `invalidateAll()`
  - Resync також обробляє `invalidate` hints

## Scope strategy

**Backend:**
- Якщо `projectId` є → `scopeType='project'`, `scopeId=projectId` → room `project:{projectId}`
- Якщо `projectId` нема → `scopeType='global'` → room `global`

**Frontend:**
- При connect автоматично join `global`
- Для project rooms: використовувати `joinBoRooms(['project:123'])` при навігації (опційно, поки не реалізовано автоматично)

## Покриті entityType (invalidate hints)

✅ **Supply**: invoice, supply_order/order, supply_receipt/receipt, supply_request, supply_payable/payable, supply_material/material  
✅ **Estimate**: act, quote/estimate, stage  
✅ **Warehouses**: warehouse_movement/movement, warehouse  
✅ **Sales**: client, object/project, deal  
✅ **Delivery**: work_log/delivery_work_log, delivery_act  
✅ **Finance**: transaction, wallet  
✅ **Common**: document

## Testing

1. **Live працює як раніше**: 2 вкладки → зміна в одній → друга оновлюється без F5
2. **Трафік зменшився**: при зміні "акт" не перезапитуються "склади/накладні" (якщо є мапінг)
3. **Нема шторму**: 10 змін підряд → не 10 перезапитів, а 1–2 батчі (debounce 200ms)
4. **Fallback безпечний**: якщо для сутності нема hints → все одно оновлюється через `invalidateAll()`

## Build confirmation

- Backend: `npm run build` ✅
- Frontend: `npm run build` (перевірити)

## Next steps (optional)

- **PART D1**: Автоматичний join/leave project rooms при навігації (router integration)
- **PART D2**: Перевірка permissions на project join (вже є в `collab.gateway.ts`)
- **PART B4**: Active page optimization (не invalidate модулі, які не відкриті)
