# Як оновити онлайн-версію (застосувати останні зміни на сервері)

**Одна кнопка для запуску в онлайн режимі з ПК (локально):** подвійний клік по **`Deployment\run-online.bat`**. Скрипт щоразу збирає актуальний Frontend і Backend, зупиняє попередні процеси і запускає Backend + Nginx. Відкривай http://localhost — це й є «онлайн режим» з твого ПК.

---

Нижче — як саме викласти останні зміни на **віддалений сервер**.

Щоб усі останні оновлення (real-time, presence, activity, виправлення таблиці, логування тощо) працювали в онлайн-версії, потрібно оновити **Frontend** і **Backend** на сервері.

---

## Варіант 1: Швидке оновлення (локально зібрати → завантажити на сервер)

### 1. Frontend (збірка для онлайн)

На **локальній машині** у папці проєкту:

```batch
cd F:\BUD_office\Frontend
```

Переконайся, що для **онлайн** використовуються відносні URL (без localhost):

- Файл **`.env.production`** або **`.env`** при збірці має містити:
  ```
  VITE_API_URL=/api
  VITE_WS_URL=/
  ```
  (це вже налаштовано в `.env.production`.)

Збери фронтенд:

```batch
npm run build
```

Після цього папка **`Frontend\dist`** містить актуальний SPA для сервера.

### 2. Запакувати Frontend для сервера

Запусти (з кореня проєкту або з `Deployment`):

```batch
F:\BUD_office\Deployment\build-and-deploy.bat
```

Скрипт:

- збирає Frontend (якщо ще не збирав);
- копіює `dist` у `Deployment\deploy-package\www`;
- створює **`Deployment\bud-office-frontend.zip`**.

### 3. Завантажити на сервер

**Варіант A — тільки Frontend (якщо Backend уже працює на сервері):**

1. Завантаж **`bud-office-frontend.zip`** на сервер (SCP, WinSCP, FileZilla тощо).
2. На сервері:
   ```bash
   sudo mkdir -p /var/www/bud-office
   unzip -o bud-office-frontend.zip -d /var/www/bud-office/
   sudo chown -R www-data:www-data /var/www/bud-office
   ```
3. У браузері зроби жорстке оновлення сторінки (**Ctrl+F5**), щоб не використовувався старий кеш.

**Варіант B — Frontend + Backend одним пакетом:**

1. **Backend** теж потрібно зібрати і покласти в пакет:
   - На локальній машині:
     ```batch
     cd F:\BUD_office\Backend
     npm run build
     ```
   - Скопіюй вміст **`Backend`** (включно з папкою **`dist`**, `package.json`, `package-lock.json`) у **`Deployment\deploy-package\backend`** (замінити старий вміст).
   - Файл **`.env`** на сервері не перезаписуй — налаштуй його вручну на сервері (DB_*, JWT_SECRET тощо).
2. Запакуй повний пакет:
   ```powershell
   F:\BUD_office\Deployment\pack-deploy.ps1
   ```
   З’явиться **`Deployment\bud-office-deploy.zip`**.
3. Завантаж **`bud-office-deploy.zip`** на сервер, розпакуй, запусти деплой:
   ```bash
   unzip -o bud-office-deploy.zip -d bud-deploy
   cd bud-deploy
   chmod +x deploy.sh
   ./deploy.sh
   ```
   Скрипт оновить файли в `/var/www/bud-office`, nginx і (якщо backend у пакеті) backend (наприклад через PM2).

---

## 4. Міграції БД (якщо додавали нові таблиці)

Якщо в проєкті з’явилися нові міграції (наприклад **`activity_log`**), їх потрібно один раз виконати на **серверній** БД:

1. На сервері перейди в каталог Backend (наприклад `/opt/bud-office/backend` або туди, де розпаковано backend).
2. Переконайся, що **`.env`** на сервері вказує на потрібну БД (DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME).
3. Запусти міграції (команда залежить від того, як вони організовані у проєкті), наприклад:
   ```bash
   node tools/run-migrations.mjs
   ```
   або
   ```bash
   npm run migrate
   ```
   Якщо використовується окремий SQL-файл (наприклад `Backend/sql/2026-02-04_activity_log.sql`), виконай його вручну в клієнті PostgreSQL на сервері.

---

## 5. Перезапуск Backend на сервері

Після оновлення файлів backend (наприклад після розпакування нового пакета або ручного копіювання):

- Якщо використовується **PM2**:
  ```bash
  cd /opt/bud-office/backend   # або шлях до backend на сервері
  pm2 restart bud-backend
  ```
- Якщо backend запущений вручну — зупини старий процес і запусти знову:
  ```bash
  node dist/main.js
  ```

---

## Короткий чеклист

| Крок | Дія |
|------|------|
| 1 | Локально: `Frontend`: перевірити `.env.production` (VITE_API_URL=/api, VITE_WS_URL=/), потім `npm run build` |
| 2 | Локально: запустити `Deployment\build-and-deploy.bat` → отримати `bud-office-frontend.zip` |
| 3 | Завантажити zip на сервер, розпакувати в `/var/www/bud-office/`, при потребі оновити права (chown) |
| 4 | (Якщо оновлював backend) Зібрати Backend локально, покласти у `deploy-package\backend` або окремо завантажити на сервер; на сервері перезапустити backend (pm2 restart або вручну) |
| 5 | (Якщо є нові таблиці) На сервері виконати міграції БД |
| 6 | У браузері відкрити онлайн-версію та зробити **Ctrl+F5** |

Після цього онлайн-версія працює з усіма останніми оновленнями (real-time, presence, збереження позицій рядків у таблиці, вимкнений спам логів тощо).
