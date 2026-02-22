# Realtime + Persistence: що гарантуємо і як перевірити

## Гарантії

1. **Будь-яка зміна даних** (редагування клітинок, рядків/колонок, форматування, стилі) йде на сервер:
   - **WS увімкнено:** через WebSocket `APPLY_OP` (collab), сервер зберігає в `documents.meta.sheetSnapshot` + `sheetRevision`, broadcast `OP_APPLIED` іншим клієнтам.
   - **WS вимкнено:** через REST `PATCH /documents/:id` з `meta.sheetSnapshot`, сервер зберігає в БД.

2. **Після F5 / logout–login / перезапуску сервера** дані не губляться: snapshot і revision зберігаються в таблиці `documents` (колонка `meta` JSONB). Завантаження документа — `GET /documents/:id`, далі гідрація з `meta.sheetSnapshot`.

3. **Інший користувач у той самий момент** бачить зміни без F5 за рахунок WebSocket: сервер після `applyOp` робить `server.to(room).emit('collab', { type: 'OP_APPLIED', docId, version, op, ... })`, інші клієнти отримують `OP_APPLIED` і застосовують `onRemoteUpdate(snapshot)`.

4. **Режими:** працює в **Local** (VITE_API_URL / VITE_WS_URL напряму на backend) і в **Nginx** (проксі на один домен, WS через `/socket.io`).

---

## Як перевірити (шпаргалка)

### WS-істина
- Є ACK від сервера: клієнт відправляє `APPLY_OP`, отримує `OP_APPLIED` з тим самим `clientOpId` і збільшеним `version`.
- Інший клієнт у тій самій кімнаті отримує той самий `OP_APPLIED` (без свого clientOpId) і застосовує remote snapshot.
- **Перевірка:** увімкни `localStorage.setItem('DEBUG_REALTIME_AUDIT', '1')`, зроби зміну в таблиці — у консолі мають з’явитися логи `SEND_OP_WS` та (на другому клієнті) `APPLY_REMOTE_OP`. На бекенді — `RECEIVE_OP`, `PERSIST_SNAPSHOT`, `BROADCAST_OP`.

### DB-істина
- Після перезапуску backend документ відновлюється з тим самим вмістом.
- **Перевірка:** зроби зміну, перезапусти backend, відкрий документ знову (або викликай `GET /documents/:id`) — у відповіді `meta.sheetSnapshot` має містити оновлені дані, `meta.sheetRevision` (або document `revision`) збільшений.

### Fallback-істина
- Коли WS немає (відключити мережу для socket.io або заблокувати в тесті), зміни йдуть через REST `saveSnapshot` (PATCH documents).
- **Перевірка:** вимкни WS (наприклад, route block у Playwright на `/socket.io`), зроби зміну — у консолі має бути `SAVE_SNAPSHOT_REST`. Після reconnect або F5 дані з сервера мають бути актуальними.

---

## Запуск E2E тестів

### Local
```bash
# Terminal 1: backend
cd Backend && npm run start:dev

# Terminal 2: frontend
cd Frontend && npm run dev

# Terminal 3: Playwright (з папки Frontend)
cd Frontend
npm install && npx playwright install chromium
# Windows:
set BASE_URL=http://localhost:5173
set API_BASE_URL=http://localhost:3000/api
npm run test:e2e
# Linux/macOS:
# BASE_URL=http://localhost:5173 API_BASE_URL=http://localhost:3000/api npm run test:e2e
```

Опційно: `PLAYWRIGHT_TEST_USER`, `PLAYWRIGHT_TEST_PASSWORD` — облікові дані для логіну (за замовчуванням test@test.com / test).

### Nginx (prod-like)
1. Налаштуй Nginx за `Backend/docs/NGINX-SOCKETIO.md`.
2. Вкажи baseURL на домен (де віддається фронт), API_BASE_URL — на той самий домен (наприклад `https://your-domain.com/api`), щоб тести ходили на API через проксі.
3. Запуск:
```bash
cd Frontend && BASE_URL=https://your-domain.com API_BASE_URL=https://your-domain.com/api npm run test:e2e
```

---

## Інструментація (аудит)

- **Frontend:** при `localStorage.getItem('DEBUG_REALTIME_AUDIT') === '1'` у консолі логи: `SEND_OP_WS`, `SAVE_SNAPSHOT_REST`, `APPLY_REMOTE_OP` (з docId/version де можливо).
- **Backend:** при змінній оточення `DEBUG_REALTIME_AUDIT=1` логи: `RECEIVE_OP`, `BROADCAST_OP`, `PERSIST_SNAPSHOT`, `LOAD_SNAPSHOT` (docId, version).

У відповідях вже є: `OP_APPLIED.version`, документ API повертає `meta.sheetRevision` та `revision` — тести можуть асертити їх.

### WS diagnostics (connection / health)

- **Frontend (collab + realtime):** у консолі браузера завжди логуються (без токенів): `wsUrl`, `path`, події `connect`, `disconnect` (reason), `connect_error` (message), `reconnect_attempt`, `reconnect_failed`, `auth_error`. Корисно для діагностики чому WS не піднімається або від’єднується.
- **Backend (CollabGateway):** у логах сервера: при підключенні — `WS connected socketId=… userId=…`; при відключенні — `WS disconnect socketId=… userId=…`; при невалідному JWT — `WS connect rejected: auth failure (invalid token)` (токен у логи не пишеться).
- **Health check:** клієнт може надіслати подію `ping` на namespace — сервер відповідає `pong`; це дозволяє швидко перевірити, що WS живий.
- **Watchdog (collab):** клієнт sheet collab періодично (≈12 с) надсилає `ping` і чекає `pong` (timeout 4 с). Якщо `pong` не прийшов — у консолі `[collab] ws unhealthy (pong timeout), fallback to REST`, викликається `onUnhealthy` і режим переходить у REST (`collabConnected=false`) без перезавантаження сторінки. Один interval на клієнт; при disconnect/reconnect_failed watchdog зупиняється.

**Backend E2E (опційно):** перевірка через повний стек (Nest + БД + socket.io) — підняти app, підключити socket.io-клієнт з JWT, відправити `APPLY_OP`, перевірити оновлення документа в БД. Наразі «серверна істина» перевіряється в Playwright тесті D через `GET /documents/:id` після зміни з UI.
