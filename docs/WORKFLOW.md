# Start Work Checklist (стандартний старт роботи над проєктом)

Короткий чекліст перед кожним STEP, щоб не ламати проєкт.

## Перед STEP

- **Checkpoint:** `git status` — переконатися, що робоча копія передбачувана.
- За потреби: зробити коміт checkpoint або створити нову гілку для задачі.

## Запуск online mode

- Запустити **Deployment/run-online.bat** (build + backend:3000 + nginx).
- Перевірити в браузері: **http://localhost/login** відкривається.

## E2E smoke

- У окремому терміналі:
  - `E2E_BASE_URL=http://localhost`
  - `E2E_EMAIL` та `E2E_PASSWORD` (env, без коміту в репо)
  - `cd Frontend && npm run e2e`
- **Очікування:** 2 passed (quotes + invoices).

## Backend gate

- `cd Backend && npm test` — unit/інтеграційні тести (якщо є).

## Frontend gate

- `cd Frontend && npm run build` — збірка без помилок.

## Якщо щось падає

- **STOP.** Малий фікс → прогнати тест/checks знову. Не накопичувати зміни.

## Auth Source of Truth

- **Canonical AuthContext (реалізація + useAuth):** `Frontend/src/modules/auth/context/AuthContext.tsx`
- **Canonical AuthProvider:** той самий файл (експорт `AuthProvider`); підключається в `main.tsx`.
- **Canonical ProtectedRoute:** `Frontend/src/modules/auth/ProtectedRoute.tsx` — використовується в `App.tsx`.
- **Canonical LoginPage:** `Frontend/src/modules/auth/LoginPage.tsx` — використовується в `App.tsx`.
- **Canonical Router entry:** `Frontend/src/App.tsx` (всі маршрути); точка входу — `main.tsx` → `App`.

Не імпортувати auth/ProtectedRoute/Login з **legacy** шляхів: `src/auth/*`, `src/_legacy_routes/*`. Зміни в авторизації — тільки через канонічні файли вище.

Legacy папки позначені DEPRECATED: **Frontend/src/auth/**, **Frontend/src/_legacy_routes/**. Не імпортувати. Якщо потрібно — спочатку обговорити з Назаром.

## Нагадування

- Без змін у **Frontend/src/sheet/** без окремого ТЗ.
- Без масових змін — один логічний крок = один малий diff = один коміт.
- **DONE** тільки за DONE GATE: lint/typecheck/build (і тести) прогнані або чітко "НЕ ПРОГНАНО" + команди для локального запуску.
