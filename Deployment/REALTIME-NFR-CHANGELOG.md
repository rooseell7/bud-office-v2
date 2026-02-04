# NFR для real-time синхронізації — Changelog

Індикатор з’єднання, rooms з валідацією, debounce/dedup, optimistic locking (409), presence, activity log, observability, reconnect policy.

---

## D1) UI індикатор синхронізації (Online / Reconnecting / Offline)

**Frontend**
- **RealtimeContext:** додано `connectionStatus: 'connected' | 'reconnecting' | 'offline'` і стан `reconnecting` (при `onDisconnect` встановлюється `true`, при `onConnect` — `false`).
- **MainLayout:** у шапці (ліворуч від аватара) компактний бейдж:
  - ● **Online** (зелений) — WS connected
  - ● **Reconnecting…** (жовтий, пульсація) — після disconnect
  - ● Offline — без токена або не підключались
- При відсутності WS або офлайні застосунок працює на REST без падінь.

**Acceptance:** Вимкнути мережу → статус Offline; увімкнути → Reconnecting → Online, дані оновлюються.

---

## D2) Rooms (масштабування і точність подій)

**Backend**
- Кімнати: `project:{id}`, `module:execution`, `module:finance`.
- **CollabGateway.handleRealtime:**
  - **JOIN_PROJECT:** перевірка доступу — `Project` з `id` та `userId` (власник). Якщо проект не знайдено — join не виконується, пишеться debug-лог.
  - **JOIN_MODULE** / **LEAVE_MODULE** — будь-який авторизований клієнт (модульні кімнати).
- Логування join/leave на рівні debug: `[realtime] join room=... userId=...`.
- **CollabModule:** імпорт `TypeOrmModule.forFeature([Project])` та `PresenceModule` для PresenceService.

**Frontend**
- Без змін протоколу: як і раніше `joinProject(projectId)`, `joinModule('execution'|'finance')` на mount та leave на unmount (ExecutionProjectDetailsPage, ExecutionProjectsPage, FinanceDashboardPage).

**Acceptance:** Події проекту отримують лише клієнти, які відкрили цей проект (room isolation).

---

## D3) Dedup подій + debounce інвалідацій

**Frontend**
- **realtimeClient.ts:** зберігається до 500 `eventId` у `seenIds`; при переповненні залишаються останні 250. Подія з вже обробленим `eventId` ігнорується.
- **RealtimeContext:** debounce 400 ms перед викликом handlers (один виклик на серію подій).

**Acceptance:** Серія подій не викликає десятки refetch і не фризить UI.

---

## D4) Optimistic locking / 409 Conflict

**Backend**
- **Execution:** `UpdateExecutionTaskDto` — опційне поле `expectedUpdatedAt?: string`. У `ExecutionService.updateTask` перед оновленням порівняння `task.updatedAt` з `expectedUpdatedAt`; при розбіжності — `ConflictException` з тілом `{ message, current }` (актуальний task DTO).
- **Finance:** `UpdateTransactionDto` — опційне `expectedUpdatedAt`. У `FinanceService.updateTransaction` аналогічна перевірка та 409 з `current`.

**Frontend**
- **api/execution:** у `updateExecutionTask` додано `expectedUpdatedAt` у тип DTO.
- **api/finance:** у `updateTransaction` додано `expectedUpdatedAt`.
- **ExecutionProjectDetailsPage:** при зміні статусу передається `expectedUpdatedAt: task.updatedAt`; при помилці з `response.status === 409` показується Snackbar «Запис оновлено іншим користувачем. Підтягую актуальні дані.» та викликається `load()`.

**Acceptance:** Двоє змінюють одну задачу → один отримує 409, toast і refetch, UI не ламається.

---

## D5) Presence (хто онлайн)

**Backend**
- **PresenceService** (in-memory): `Map<userId, { lastSeenAt }>`. Метод `seen(userId)` оновлює `lastSeenAt`. Метод `getOnlineUserIds()` повертає userId з `lastSeenAt` у межах 90 с і прибирає застарілі.
- **CollabGateway:** при `handleConnection` (якщо є `userId`) викликається `presenceService.seen(userId)`. Обробник `realtime` з типом `PRESENCE_PING` оновлює `presenceService.seen(userId)`.
- **PresenceController:** `GET /api/presence/online` — JWT, повертає `{ id, fullName }[]` для онлайн (через User repo). `GET /api/presence/projects/:id` — поки що повертає той самий список (MVP).
- **PresenceModule** зареєстровано в AppModule; CollabModule імпортує PresenceModule.

**Frontend**
- **realtimeClient.ts:** кожні 45 с надсилається `realtime` з `type: 'PRESENCE_PING'`.
- **api/presence.ts:** `getPresenceOnline()`.
- **MainLayout:** при `connectionStatus === 'connected'` раз на 30 с запитується `/presence/online`, у бейджі показується «· N онлайн».

**Acceptance:** Два браузери відкриті → обидва в списку online; після 90 с без пінгу користувач зникає з списку.

---

## D6) Activity Log

Вже реалізовано в REALTIME-SYNC-CHANGELOG: запис у `activity_log` при кожному broadcast, `GET /api/activity`, блок «Остання активність» на Home. Без змін.

---

## D7) Observability / Debug

**Backend**
- **RealtimeService.broadcast:** лог на рівні `log` (не debug): `eventId`, `entity`, `action`, `actorId`, `rooms`, `ts`.
- **CollabGateway:** join/leave rooms логуються на рівні `debug`.

**Frontend**
- **RealtimeDebugPanel:** компонент показує останні 20 domain events у фіксованій панелі (bottom-right). Увімкнення: `localStorage.setItem('DEBUG_WS_EVENTS', '1')`.
- Панель рендериться в MainLayout; при відсутності флагу не показується.

**Acceptance:** У логах бекенду видно події та rooms; у dev при увімкненому флагу видно отримані події на клієнті.

---

## D8) Reconnect policy

Вже реалізовано: при `onConnect` викликаються зареєстровані `refetchOnReconnect` (ExecutionProjectDetailsPage, ExecutionProjectsPage, FinanceDashboardPage). Один refetch видимих екранів, без повного перезавантаження додатку.

**Acceptance:** Відключення/включення мережі → після reconnect дані актуалізуються без F5.

---

## Список змінених/нових файлів

### Backend (нові)
- `Backend/src/presence/presence.service.ts`
- `Backend/src/presence/presence.controller.ts`
- `Backend/src/presence/presence.module.ts`

### Backend (змінені)
- `Backend/src/app.module.ts` — імпорт PresenceModule
- `Backend/src/collab/collab.module.ts` — імпорт PresenceModule, TypeOrmModule Project
- `Backend/src/collab/collab.gateway.ts` — валідація JOIN_PROJECT (Project repo), лог join/leave, PRESENCE_PING, PresenceService.seen на connect і на ping
- `Backend/src/realtime/realtime.service.ts` — лог domain events на рівні log
- `Backend/src/execution/execution.service.ts` — перевірка expectedUpdatedAt, 409 Conflict
- `Backend/src/execution/dto/update-execution-task.dto.ts` — поле expectedUpdatedAt
- `Backend/src/finance/finance.service.ts` — перевірка expectedUpdatedAt, 409 Conflict
- `Backend/src/finance/dto/update-transaction.dto.ts` — поле expectedUpdatedAt

### Frontend (нові)
- `Frontend/src/realtime/RealtimeDebugPanel.tsx`
- `Frontend/src/api/presence.ts`

### Frontend (змінені)
- `Frontend/src/realtime/RealtimeContext.tsx` — connectionStatus, reconnecting
- `Frontend/src/realtime/realtimeClient.ts` — dedup 500, presence ping кожні 45 с
- `Frontend/src/modules/layout/MainLayout.tsx` — індикатор Online/Reconnecting/Offline, N онлайн, RealtimeDebugPanel
- `Frontend/src/api/execution.ts` — expectedUpdatedAt у updateExecutionTask
- `Frontend/src/api/finance.ts` — expectedUpdatedAt у updateTransaction
- `Frontend/src/modules/execution/pages/ExecutionProjectDetailsPage.tsx` — expectedUpdatedAt при оновленні статусу, обробка 409, Snackbar

---

## Інструкція тесту: 2 браузери + offline/reconnect + conflict

1. **Підготовка**
   - Запустити backend і frontend. Два облікові запити (наприклад User A, User B).

2. **Індикатор і Presence**
   - Увійти в один браузер (User A). У шапці: ● Online, потім «· 1 онлайн» (або 2, якщо є інший відкритий клієнт).
   - Відкрити другий браузер / інкогніто (User B). У обох має бути «· 2 онлайн».
   - Вимкнути мережу в одному браузері: статус має стати Reconnecting…, потім Offline. UI без падінь.
   - Увімкнути мережу: Reconnecting… → Online, дані оновлюються (refetch).

3. **Rooms**
   - Браузер A: відкрити «Відділ реалізації» → один об’єкт (наприклад id=1).
   - Браузер B: не відкривати цей об’єкт (залишитись на списку).
   - У A: створити задачу або змінити статус. У B на списку має оновитись список (module:execution). Якщо B не заходив в проект 1 — події тільки для project:1 не приходять в B (якщо B не join’ив project:1).

4. **Conflict 409**
   - Відкрити один і той самий об’єкт (одна задача) у двох браузерах (A та B).
   - У A: змінити статус задачі (наприклад на «В роботі») і зберегти.
   - У B: не оновлюючи сторінку, змінити статус тієї самої задачі (наприклад на «Готово») і зберегти.
   - Очікування: у B або у A (залежно від порядку) з’являється 409, toast «Запис оновлено іншим користувачем. Підтягую актуальні дані.» і список/деталі перезавантажуються.

5. **Debug panel**
   - В консолі: `localStorage.setItem('DEBUG_WS_EVENTS', '1')`, оновити сторінку.
   - У правому нижньому куті має з’явитись панель з останніми WS подіями. Виконати дію (задача/транзакція) — у панелі має з’явитись відповідна подія.

6. **Sheet**
   - Переконатись, що КП/Акти/Накладні (Sheet) і колаб по документах працюють як раніше; логіку в `Frontend/src/sheet` не змінювали.
