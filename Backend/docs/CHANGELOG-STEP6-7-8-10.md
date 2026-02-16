# CHANGELOG: STEP 6 + STEP 7 + STEP 8 + STEP 10

## Activity Feed + Server Drafts + Permissions-aware Live + Notifications

**Дата:** 2026-02-07

---

## STEP 6 — Activity Feed (audit_log)

### Backend
- **audit_log** — вже існує з полями: `createdAt`, `actorUserId`, `action`, `entityType`, `entityId`, `projectId`, `meta`
- **ActivityFeedService** (`Backend/src/audit/activity-feed.service.ts`) — читання audit_log з JOIN users, entity title resolve
- **ActivityFeedController** (`Backend/src/audit/activity-feed.controller.ts`) — API:
  - `GET /api/activity/feed` — scope=global|project|entity, projectId, entityType, entityId, actorUserId, actionPrefix, from, to, cursor, limit
  - `GET /api/activity/feed/entity/:entityType/:entityId`
  - `GET /api/activity/feed/project/:projectId`
- **Permissions:** `activity:read:global` (додано в permissions.ts), project activity — projects:read або ролі в проєкті
- **Invalidate hints** — додано activity:feed:global, activity:feed:project:X в invalidate-hints.ts

### Frontend
- **API** (`Frontend/src/api/activity.ts`) — getActivityFeed, getActivityFeedByProject, getActivityFeedByEntity
- **ActivityPage** (`Frontend/src/pages/activity/ActivityPage.tsx`) — глобальна стрічка з фільтрами
- **ProjectActivityPanel** (`Frontend/src/modules/activity/ProjectActivityPanel.tsx`) — активність по проєкту
- **Nav** — пункт "Активність" (Система) для користувачів з activity:read:global
- **ProjectDetailsPage** — вкладка "Активність"
- **Route** — `/activity`
- **Query keys** — activity-feed:global, activity-feed:project:X, activity-feed:entity:T:id
- **Invalidate** — при bo:invalidate з activity:feed:* перезапитується activity-feed

---

## STEP 7 — Server Drafts

### Backend
- **Migration** `2026-02-07_drafts.sql` — таблиця `drafts` (userId, scopeType, projectId, entityType, entityId, key, payload, updatedAt, expiresAt, version)
- **Draft entity** (`Backend/src/drafts/draft.entity.ts`)
- **DraftsService** — get, upsert, delete, getRecent
- **DraftsController** — GET /drafts?key=, PUT /drafts?key=, DELETE /drafts?key=, GET /drafts/recent
- **Canonical key:** `draft:{entityType}:{mode}:{projectId?}:{entityId?}`

### Frontend
- **draftsApi.ts** (`Frontend/src/shared/drafts/draftsApi.ts`) — loadDraft, saveDraft, clearDraft, buildDraftKey
- **useDraft.ts** (`Frontend/src/shared/drafts/useDraft.ts`) — hook з debounce 600ms

### Integration (TODO)
- Інтеграція useDraft в InvoiceDetailsPage, Act editor, Order create/edit, MovementCreateDialog — потребує доопрацювання форм

---

## STEP 8 — Permissions-aware Live

### Існуючий стан
- **CollabGateway** — validateRoomAccess перевіряє project.userId, ownerId, foremanId, estimatorId, supplyManagerId
- **OutboxPublisher** — emit до global, project:{id}, user:{id}
- **bo:join** — доступ до room перевіряється через validateRoomAccess
- **Sync endpoint** — GET /realtime/sync — потребує додаткової перевірки доступу (TODO)

### TODO
- Sync endpoint — фільтрувати події по доступу користувача
- Frontend — join user:{userId} після логіну для notifications

---

## STEP 10 — Notifications

### TODO
- Migration для notifications таблиці
- Notification entity
- NotificationsController, NotificationsService
- Outbox eventType=notify, scopeType=user, scopeId=userId
- Publisher — emit bo:notify до user:{userId}
- Frontend — дзвіночок, NotificationsPage, join user room

---

## Міграції (порядок)

| № | Файл |
|---|------|
| 21 | 2026-02-07_drafts.sql |

---

## Змінені/додані файли

### Backend
- `src/auth/permissions/permissions.ts` — activity:read:global
- `src/audit/activity-feed.service.ts` — NEW
- `src/audit/activity-feed.controller.ts` — NEW
- `src/audit/audit.module.ts` — ActivityFeedService, ActivityFeedController, User, Project
- `src/realtime/invalidate-hints.ts` — activityQueries
- `src/drafts/draft.entity.ts` — NEW
- `src/drafts/drafts.service.ts` — NEW
- `src/drafts/drafts.controller.ts` — NEW
- `src/drafts/drafts.module.ts` — NEW
- `src/app.module.ts` — DraftsModule
- `sql/2026-02-07_drafts.sql` — NEW
- `tools/run-migrations.mjs` — 2026-02-07_drafts.sql

### Frontend
- `src/api/activity.ts` — getActivityFeed, getActivityFeedByProject, getActivityFeedByEntity
- `src/shared/realtime/queryKeys.ts` — ACTIVITY_FEED_*
- `src/shared/realtime/invalidate.ts` — activity:feed:*
- `src/pages/activity/ActivityPage.tsx` — NEW
- `src/modules/activity/ProjectActivityPanel.tsx` — NEW
- `src/modules/layout/MainLayout.tsx` — пункт Активність, TimelineIcon
- `src/modules/projects/ProjectDetailsPage.tsx` — вкладка Активність
- `src/App.tsx` — route /activity
- `src/shared/drafts/draftsApi.ts` — NEW
- `src/shared/drafts/useDraft.ts` — NEW

---

## Тест (2 сесії)

### STEP 6 — Activity
1. Сесія A: залогінитись як admin
2. Сесія B: залогінитись як supply_manager
3. Сесія A: перейти в Активність → бачити глобальну стрічку
4. Сесія A: створити накладну або акт
5. Сесія B: в Активності зʼявляється запис
6. Сесія A: відкрити обʼєкт → вкладка Активність → бачити події по проєкту

### STEP 7 — Drafts
1. Сесія A: почати створювати обʼєкт (ProjectCreatePage/ObjectCreatePage)
2. Ввести дані, F5
3. При відновленні — prompt "Знайдено чернетку. Відновити / Скинути" (після інтеграції useDraft)
4. Зберегти обʼєкт → чернетка очищена

### STEP 8 — Live
1. Сесія A: відкрити обʼєкт з projectId
2. Сесія B (без доступу до projectId): не бачить live-оновлень по цьому проєкту

### STEP 10 — Notifications
1. Сесія A: створити накладну
2. Сесія B (одержувач): зʼявляється нотифікація live, unread count

---

## Build

```bash
cd Backend; npm run build
cd Frontend; npm run build
```

Обидва build виконуються успішно.
