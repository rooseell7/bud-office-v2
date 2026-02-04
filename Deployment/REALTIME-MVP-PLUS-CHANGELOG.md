# BUD_OFFICE Real-time Sync MVP+ (консолідований) — Changelog

Server as Source of Truth + WS Domain Events + Rooms + Frontend Invalidate Map + Reconnect + Dedup/Debounce + Presence + Activity Log + Home Activity Feed + Мінімальна Observability. **Sheet не чіпали.**

---

## E1) Backend: Стандарт DomainEvent + Broadcast Service

### E1.1 Формат події
- **Backend:** `Backend/src/realtime/domain-event.types.ts` — контракт `DomainEvent`: `eventId`, `ts`, `actorId`, `entity`, `action`, `entityId`, `projectId?`, `payload?`, **`eventVersion: 1`**.
- Entities: `project` | `task` | `transaction` | `wallet` | `object`. Actions: `created` | `updated` | `deleted` | `status_changed`.

### E1.2 WS event name
- Один канал **`domain:event`** для всіх доменних подій. Sheet-івенти не використовуються.

### E1.3 Broadcast service
- **Backend:** `Backend/src/realtime/realtime.service.ts`:
  - `broadcast(event, rooms[])` — основний метод (після успішного commit).
  - `broadcastToRooms(event, rooms[])` — те саме.
  - `broadcastModule(event, 'execution' | 'finance')` — у кімнату `module:execution` / `module:finance`.
  - `broadcastProject(event, projectId)` — у кімнату `project:{id}`.
- Перед broadcast викликається запис у `activity_log` (ActivityService.log).

---

## E2) Backend: Rooms + join/leave + permission check

### E2.1 Rooms naming
- `project:{id}`, `module:execution`, `module:finance`.

### E2.2 Join/Leave протокол
- **WS handlers:**
  - **`rooms:join`** з payload `{ room: string }` — валідація, потім `client.join(room)`.
  - **`rooms:leave`** з payload `{ room: string }` — `client.leave(room)`.
- Існуючий протокол **`realtime`** з типами `JOIN_PROJECT`, `LEAVE_PROJECT`, `JOIN_MODULE`, `LEAVE_MODULE` збережено для сумісності.

### E2.3 Безпека
- **CollabGateway:** `validateRoomAccess(room, userId)`:
  - `project:{id}` → перевірка через `Project` (id + userId, власник).
  - `module:execution` | `module:finance` → дозволено авторизованому користувачу.
- При відсутності доступу join не виконується, пишеться debug-лог.

---

## E3) Backend: Точки емісії подій

- **Execution:** після createTask, updateTask, addTaskComment — broadcast у `project:{projectId}` та `module:execution`. Payload мінімальний (title, status, comment).
- **Finance:** після createWallet, updateWallet, createIn, createOut, createTransfer, updateTransaction — broadcast у `module:finance` та за наявності `projectId` у `project:{projectId}`.
- **Objects:** після create та update — broadcast у `project:{id}`.

Усі події мають **eventVersion: 1**.

---

## E4) Frontend: Realtime client + subscriber

### E4.1 Realtime client
- **Frontend:** `Frontend/src/realtime/realtimeClient.ts` — окремий Socket.IO клієнт (не sheet): підключення з `wsBaseUrl` та JWT з env/AuthContext.
- API: підписка на `domain:event`, `joinProject`/`leaveProject`, `joinModule`/`leaveModule`, стан `connected`.
- **Frontend:** `Frontend/src/realtime/RealtimeContext.tsx` — провайдер: `subscribe(handler)`, `refetchOnReconnect(fn)`, `joinProject`/`leaveProject`/`joinModule`/`leaveModule`, **connectionStatus**: `connected` | `reconnecting` | `offline`.

### E4.2 Subscriber
- Один глобальний subscriber на рівні RealtimeProvider: при отриманні `domain:event` подія передається в зареєстровані handlers (event router / map).

---

## E5) Frontend: Event → Invalidate Map

- **Стратегія:** зареєстровані handlers у сторінках визначають, які дані інвалідувати:
  - **task.*** → refetch задач і project details (ExecutionProjectDetailsPage, ExecutionProjectsPage).
  - **transaction.*** / **wallet.*** → refetch balances + transactions (FinanceDashboardPage).
  - **project.*** → можна додати refetch списків/деталей об’єктів.
- Реалізація: виклик існуючих `load()` / refetch без перебудови store; без “refetch all”.

---

## E6) Reconnect policy + UI індикатор Online/Offline

### E6.1 UI індикатор
- У шапці (MainLayout): компактний бейдж **Online** / **Reconnecting** / **Offline** (колір + крапка). При наявності realtime контексту показується завжди.

### E6.2 Reconnect refetch (one-shot)
- При `onConnect` викликаються зареєстровані **refetchOnReconnect** callbacks (ExecutionProjectDetailsPage, ExecutionProjectsPage, FinanceDashboardPage) — один refetch видимих екранів, без повного перезавантаження.

---

## E7) Dedup + Debounce invalidations

### E7.1 Dedup
- У клієнті зберігається **Set останніх ~500 eventId**. Повторні події з тим самим `eventId` ігноруються.

### E7.2 Debounce
- У RealtimeContext події збираються в batch **400 ms** перед викликом handlers — одна інвалідація/група викликів на серію подій.

---

## E8) Presence (online users)

### E8.1 Backend
- **PresenceService** (in-memory): `userId → lastSeenAt`. TTL **90 с** для “online”.
- Оновлення: при WS connect та при клієнтському **PRESENCE_PING** (realtime з типом `PRESENCE_PING`) кожні **45 с**.
- **GET /api/presence/online** — JWT, повертає список онлайн: `{ id, fullName }[]`.

### E8.2 Frontend
- У шапці при Online показується **“· N онлайн”** (опитування кожні 30 с).

---

## E9) Activity Log + Home “Остання активність”

### E9.1 Backend ActivityLog
- Таблиця **activity_log**: id, ts, actorId, entity, action, entityId, projectId (nullable), summary, payload (jsonb).
- На кожен DomainEvent — запис через **ActivityService.log** (паралельно з broadcast).

### E9.2 Backend API
- **GET /api/activity?limit=20&projectId=** — JWT, read-only.

### E9.3 Frontend Home feed
- На **Home** блок **“Остання активність”** (10 записів). Клік по події → навігація до `/execution/projects/:projectId` за наявності projectId.

---

## E10) Observability

### E10.1 Backend logs
- У **RealtimeService.broadcastToRooms** лог на рівні **log**: eventId, entity, action, actorId, rooms, ts.
- Join/leave rooms логуються на рівні **debug** (CollabGateway).

### E10.2 Frontend dev debug
- Увімкнення: **`localStorage.setItem('DEBUG_WS_EVENTS', '1')`** — показується панель **RealtimeDebugPanel** (останні 20 WS подій) у правому нижньому куті. Не в prod (перевірка по флагу).

---

## Відкладено (не в MVP+)

- Optimistic locking / 409 (версії) — **знято** з execution/finance (expectedUpdatedAt видалено).
- Idempotency keys, soft delete, read models, in-project presence, окремі alerts/notifications.

---

## Список змінених/нових файлів

### Backend (нові)
- `Backend/src/realtime/domain-event.types.ts`
- `Backend/src/realtime/realtime.service.ts`
- `Backend/src/realtime/realtime.module.ts`
- `Backend/src/activity/activity-log.entity.ts`
- `Backend/src/activity/activity.service.ts`
- `Backend/src/activity/activity.controller.ts`
- `Backend/src/activity/activity.module.ts`
- `Backend/src/presence/presence.service.ts`
- `Backend/src/presence/presence.controller.ts`
- `Backend/src/presence/presence.module.ts`
- `Backend/sql/2026-02-04_activity_log.sql`

### Backend (змінені)
- `Backend/src/app.module.ts` — ActivityModule, PresenceModule, RealtimeModule, CollabModule
- `Backend/src/collab/collab.gateway.ts` — RealtimeService, PresenceService, Project repo; realtime (JOIN_PROJECT/LEAVE_PROJECT/JOIN_MODULE/LEAVE_MODULE/PRESENCE_PING); **rooms:join**, **rooms:leave**, **validateRoomAccess**
- `Backend/src/collab/collab.module.ts` — TypeOrmModule(Project), PresenceModule
- `Backend/src/execution/execution.service.ts` — RealtimeService, broadcast після createTask/updateTask/addTaskComment, eventVersion: 1 (без 409)
- `Backend/src/finance/finance.service.ts` — RealtimeService, broadcast після wallet/transaction мутацій, eventVersion: 1 (без 409)
- `Backend/src/objects/object.service.ts` — RealtimeService, broadcast після create/update, eventVersion: 1
- `Backend/tools/run-migrations.mjs` — міграція activity_log у списку

### Frontend (нові)
- `Frontend/src/realtime/types.ts`
- `Frontend/src/realtime/realtimeClient.ts`
- `Frontend/src/realtime/RealtimeContext.tsx`
- `Frontend/src/realtime/RealtimeDebugPanel.tsx`
- `Frontend/src/api/activity.ts`
- `Frontend/src/api/presence.ts`

### Frontend (змінені)
- `Frontend/src/App.tsx` — RealtimeWrapper, RealtimeProvider
- `Frontend/src/pages/home/HomePage.tsx` — блок “Остання активність”, getActivity
- `Frontend/src/modules/layout/MainLayout.tsx` — індикатор Online/Reconnecting/Offline, “· N онлайн”, RealtimeDebugPanel
- `Frontend/src/modules/execution/pages/ExecutionProjectDetailsPage.tsx` — useRealtime, joinProject/leaveProject, subscribe, refetchOnReconnect
- `Frontend/src/modules/execution/pages/ExecutionProjectsPage.tsx` — useRealtime, joinModule/leaveModule, subscribe, refetchOnReconnect
- `Frontend/src/modules/finance/pages/FinanceDashboardPage.tsx` — useRealtime, joinModule/leaveModule, subscribe, refetchOnReconnect

**Не змінювались:** `Frontend/src/sheet/**`, існуючі API контракти інших модулів (КП/Акти/Накладні/Склади тощо).

---

## Інструкція тесту (2 браузери, offline/reconnect)

1. **Підготовка**  
   Запустити backend і frontend. Два облікові запити (User A, User B). Виконати міграцію `2026-02-04_activity_log.sql`, якщо таблиця ще не створена.

2. **Синхронізація (2 браузери)**  
   - Браузер 1 (User A): Відділ реалізації → відкрити об’єкт → створити/оновити задачу або змінити статус.  
   - Браузер 2 (User B): той самий розділ/об’єкт. Без F5 мають з’явитися оновлення.  
   - Аналогічно для фінансів: додати транзакцію в одному браузері — у другому оновлюються журнал/баланси без F5.

3. **Rooms**  
   - Браузер 1: відкрити проект 1. Браузер 2: відкрити проект 2. Події проекту 1 не мають “шуміти” у контексті проекту 2 (ізоляція project room).

4. **Offline/Reconnect**  
   - У браузері 2 вимкнути інтернет → індикатор має стати Offline (або Reconnecting).  
   - Увімкнути інтернет → Reconnecting → Online → дані на видимих екранах оновлюються (one-shot refetch без F5).

5. **Dedup/Debounce**  
   Виконати 5–10 швидких змін підряд. UI не має “фризити”, не має бути десятків refetch підряд.

6. **Presence**  
   Обидва юзери відкриті → у шапці “Online · 2 онлайн”. Після закриття одного або TTL 90 с — кількість зменшується.

7. **Activity**  
   На Home видно блок “Остання активність” з останніми подіями. Клік по події з projectId веде на сторінку об’єкта.

8. **Регрес**  
   Sheet (КП/Акти/Накладні таблиці): колаб, WS/REST режим, dual-mode — без змін, все працює як раніше.

---

## Усунення неполадок

### Помилка в консолі: `GET …/api/presence/online 404 (Not Found)`
- **Причина:** запити йдуть на той самий хост (наприклад `http://localhost/api/...`), але backend не обслуговує їх: або backend не запущений на порту 3000, або nginx не проксує `/api/` на backend.
- **Що зроблено:** при 404/502/503 presence API фронтенд більше не кидає помилку в консоль — показується «Online» без кількості. Перевірте:
  1. Backend запущений: `npm run start` у `Backend/`, слухає порт 3000.
  2. Якщо заходите через nginx (наприклад `http://localhost/` або `http://IP_сервера/`): у nginx має бути `location /api/ { proxy_pass http://127.0.0.1:3000/api/; }` та `location /socket.io/ { … proxy_pass http://127.0.0.1:3000; }` (див. `Deployment/nginx-server.conf`).
  3. Якщо фронт збирається для доступу з іншого ПК: у збірці задайте `VITE_API_URL=http://IP_сервера/api` або відносний `/api`, щоб і API, і WS йшли на той самий сервер; nginx має проксувати обидва.

### Зміни в таблиці (Акт/КП/Накладні) не з’являються на іншому ПК без F5
- Синхронізація **таблиці документів** (акти, кошториси, накладні) йде через **окремий sheet/collab WebSocket** (не змінювався в MVP+). Щоб оновлення з’являлися без F5:
  1. Backend має бути запущений і доступний за тим самим хостом, що й фронт.
  2. Nginx (якщо використовується) має коректно проксувати **/socket.io/** на backend (порт 3000).
  3. У консолі браузера не має бути помилок підключення до WebSocket (перезавантажте сторінку після запуску backend).
- Після виправлення 404 і перезапуску backend/nginx перевірте ще раз: обидва ПК відкривають той самий акт; зміни мають підтягуватися через існуючий sheet collab.

### Спам у консолі беку (SELECT acts)
- **Причина:** TypeORM з `logging: true` логував кожен SQL-запит; редактор акту по кожній відкритій секції робить autosave (getAct + updateAct), тому з’являвся потік однакових SELECT.
- **Що зроблено:** логування SQL за замовчуванням вимкнено (лишаються лише помилки). Для діагностики можна ввімкнути в `.env`: `TYPEORM_LOGGING=true`.
