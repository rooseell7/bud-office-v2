# Real-time синхронізація BUD Office — Changelog

## Мета

Server as Source of Truth + WebSocket broadcast подій після commit у БД + Activity Log. Документи-таблиці (Sheet) не змінювались.

---

## PHASE 1 — Domain Events broadcast (MVP)

### D1.1 Стандарт доменних подій

- **Backend:** `Backend/src/realtime/domain-event.types.ts` — тип `DomainEvent` (eventId, ts, actorId, entity, action, entityId, projectId?, payload?).
- Entities: `project` | `task` | `transaction` | `wallet` | `object`. Actions: `created` | `updated` | `deleted` | `status_changed`.

### D1.2 WS broadcast service

- **Backend:** `Backend/src/realtime/realtime.service.ts` — `RealtimeService` з методом `broadcast(event, rooms)`.
- Кімнати: `project:{projectId}`, `module:execution`, `module:finance`.
- **Backend:** `Backend/src/realtime/realtime.module.ts` — глобальний модуль, імпортує `ActivityModule`.
- **Backend:** `Backend/src/collab/collab.gateway.ts` — додано:
  - `OnGatewayInit`, `afterInit()` — передача сервера в `RealtimeService`.
  - Обробник `realtime`: `JOIN_PROJECT`, `LEAVE_PROJECT`, `JOIN_MODULE`, `LEAVE_MODULE`.
- Існуючий канал `collab` для Sheet не змінювався.

### D1.3 Точки емісії (emit після commit)

- **Execution:** `execution.service.ts` — після `createTask`, `updateTask`, `addTaskComment` — broadcast у `project:{projectId}` та `module:execution`.
- **Finance:** `finance.service.ts` — після `createWallet`, `updateWallet`, `createIn`, `createOut`, `createTransfer`, `updateTransaction` — broadcast у `module:finance` та за наявності `projectId` у `project:{projectId}`.
- **Objects:** `object.service.ts` — після `create` та `update` (об’єкт/проєкт) — broadcast у `project:{id}`.

### D1.4 Room join

- Клієнт надсилає `realtime` з `type: 'JOIN_PROJECT' | 'LEAVE_PROJECT' | 'JOIN_MODULE' | 'LEAVE_MODULE'`; сервер викликає `client.join()` / `client.leave()`.

---

## PHASE 2 — Frontend: підписка + оновлення даних

### D2.1 Realtime client (окремо від Sheet)

- **Frontend:** `Frontend/src/realtime/realtimeClient.ts` — окремий Socket.IO клієнт (той самий `wsBaseUrl` + JWT), підписка на `domain:event`, методи `joinProject`, `leaveProject`, `joinModule`, `leaveModule`. Dedup по `eventId`.
- **Frontend:** `Frontend/src/realtime/RealtimeContext.tsx` — провайдер з `subscribe(handler)`, `refetchOnReconnect(fn)`, `joinProject`/`leaveProject`/`joinModule`/`leaveModule`, `connected`. Debounce 500 ms перед викликом handlers.

### D2.2 Стратегія оновлення

- **ExecutionProjectDetailsPage:** subscribe на події з `entity === 'task'` та `projectId === projectId` → виклик `load()`.
- **ExecutionProjectsPage:** join `module:execution`, subscribe на `entity === 'task'` → `load()`.
- **FinanceDashboardPage:** join `module:finance`, subscribe на `entity === 'transaction' | 'wallet'` → `load()`.

### D2.3 Join/Leave з UI

- Деталі об’єкта реалізації: при монті — `joinProject(projectId)`, при unmount — `leaveProject(projectId)`.
- Списки реалізації/фінансів: при монті — `joinModule('execution')` / `joinModule('finance')`, при unmount — `leaveModule(...)`.

### Інтеграція в App

- **Frontend:** `App.tsx` — додано `RealtimeWrapper` (useAuth + RealtimeProvider) і обгортку `RootLayout`: ProtectedRoute → RealtimeWrapper → MainLayout.

---

## PHASE 3 — Activity Log + Home feed

### D3.1 Таблиця ActivityLog

- **Backend:** `Backend/src/activity/activity-log.entity.ts` — сутність `activity_log` (id, ts, actorId, entity, action, entityId, projectId, summary, payload).
- **Backend:** `Backend/sql/2026-02-04_activity_log.sql` — міграція для створення таблиці вручну (якщо `synchronize: false`).
- При кожному `broadcast` викликається `ActivityService.log(event)` (запис у БД).

### D3.2 API

- **Backend:** `Backend/src/activity/activity.service.ts` — `findRecent(limit, projectId?)`, `log(event)`.
- **Backend:** `Backend/src/activity/activity.controller.ts` — `GET /api/activity?limit=20&projectId=` (JWT).
- **Backend:** `Backend/src/activity/activity.module.ts` — модуль імпортовано в `AppModule` та в `RealtimeModule`.

### D3.3 Home «Остання активність»

- **Frontend:** `Frontend/src/api/activity.ts` — `getActivity({ limit?, projectId? })`.
- **Frontend:** `Frontend/src/pages/home/HomePage.tsx` — блок «Остання активність» (10 останніх подій), клік по рядку → перехід на `/execution/projects/:projectId` за наявності `projectId`.

---

## PHASE 4 — Reliability

- **Dedup:** у клієнті `realtimeClient.ts` події з однаковим `eventId` ігноруються; зберігається останні 500–1000 id.
- **Debounce:** у `RealtimeContext` після отримання події виклик handlers відбувається з debounce 500 ms (один виклик на серію подій).
- **Reconnect:** при `onConnect` викликаються зареєстровані `refetchOnReconnect` callbacks (refetch видимих екранів один раз). Підключено на ExecutionProjectDetailsPage, ExecutionProjectsPage, FinanceDashboardPage.

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
- `Backend/sql/2026-02-04_activity_log.sql`

### Backend (змінені)

- `Backend/src/app.module.ts` — імпорт `ActivityModule`, `RealtimeModule`.
- `Backend/src/collab/collab.gateway.ts` — RealtimeService, afterInit, обробник `realtime`, типи `RealtimePayload`.
- `Backend/src/execution/execution.service.ts` — імпорт RealtimeService і domain-event типів, виклики `realtime.broadcast` після createTask, updateTask, addTaskComment.
- `Backend/src/finance/finance.service.ts` — імпорт RealtimeService і domain-event типів, виклики `realtime.broadcast` після createWallet, updateWallet, createIn, createOut, createTransfer, updateTransaction.
- `Backend/src/objects/object.service.ts` — імпорт RealtimeService і domain-event типів, виклики `realtime.broadcast` після create та update.

### Frontend (нові)

- `Frontend/src/realtime/types.ts`
- `Frontend/src/realtime/realtimeClient.ts`
- `Frontend/src/realtime/RealtimeContext.tsx`
- `Frontend/src/api/activity.ts`

### Frontend (змінені)

- `Frontend/src/App.tsx` — RealtimeWrapper, RealtimeProvider, useAuth.
- `Frontend/src/pages/home/HomePage.tsx` — блок «Остання активність», getActivity, список подій.
- `Frontend/src/modules/execution/pages/ExecutionProjectDetailsPage.tsx` — useRealtime, joinProject/leaveProject, subscribe, refetchOnReconnect.
- `Frontend/src/modules/execution/pages/ExecutionProjectsPage.tsx` — useRealtime, joinModule/leaveModule, subscribe, refetchOnReconnect.
- `Frontend/src/modules/finance/pages/FinanceDashboardPage.tsx` — useRealtime, joinModule/leaveModule, subscribe, refetchOnReconnect.

---

## Інструкція тесту «2 браузери / 2 юзери»

1. **Підготовка**
   - Запустити backend і frontend (або один порт зі зібраним frontend).
   - У БД виконати міграцію `Backend/sql/2026-02-04_activity_log.sql`, якщо таблиця `activity_log` ще не створена (або увімкнути `TYPEORM_SYNC` тимчасово для створення таблиці).
   - Мати два облікові запити (наприклад, два користувачі з різними ролями).

2. **Базова синхронізація**
   - Відкрити **браузер 1**: увійти під користувачем A. Перейти в «Відділ реалізації» → обрати об’єкт → відкрити деталі об’єкта (список задач).
   - Відкрити **браузер 2** (або інкогніто): увійти під користувачем B. Перейти в ті самі «Відділ реалізації» → той самий об’єкт.
   - У **браузері 1**: створити нову задачу або змінити статус існуючої.
   - У **браузері 2** без F5 має оновитися список задач (нова задача або змінений статус).
   - Аналогічно для **фінансів**: у одному браузері додати транзакцію або переказ; у другому — журнал/баланси мають оновитися без F5.
   - Для **об’єкта**: змінити статус об’єкта в одному браузері; у другому (якщо відкрита сторінка цього об’єкта) дані мають оновитися після підписки на `project:{id}` (якщо реалізовано join на сторінці деталей об’єкта).

3. **Кімнати**
   - Відкрити той самий об’єкт у двох вкладках (різні юзери). Події по цьому об’єкту (task/transaction) мають приходити лише тим, хто на сторінці цього об’єкта (join `project:{id}`).

4. **Стабільність**
   - Вимкнути мережу або зупинити backend; потім увімкнути/запустити. Після reconnect списки на видимих екранах (реалізація, фінанси) мають один раз перезавантажитися (refetchOnReconnect).
   - Переконатися, що Sheet (КП/Акти/Накладні) працює як раніше: колаб/WS/REST не зламані.

5. **Activity**
   - На **Home** перевірити блок «Остання активність» — мають з’явитися останні події (задачі, транзакції, об’єкти).
   - Відкрити `GET /api/activity?limit=20` (з JWT) — має повертатися список подій з полями id, ts, actorId, entity, action, entityId, projectId, summary, payload.

---

## Обмеження (не порушувались)

- Не змінювались: `Frontend/src/sheet/*`, dual-mode WS/REST, колаб, autosave, hotkeys, ПКМ.
- Існуючі API контракти (DTO/ендпоінти) поточних модулів не змінювались; додано лише нові: `GET /api/activity`, новий канал/події WS `realtime` та `domain:event`.
