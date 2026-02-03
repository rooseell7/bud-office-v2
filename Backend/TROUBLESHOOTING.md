# Усунення помилок Backend

## «Internal server error» на сторінках Фінанси / Відділ реалізації / Кабінет виконроба / Аналітика

Якщо у браузері на цих розділах з’являється **Internal server error**, а в логах Backend — помилки типу `relation "finance_wallets" does not exist` або `relation "execution_tasks" does not exist`, це означає, що **таблиці БД ще не створені**.

### Що зробити

1. **Застосувати міграції БД** (з папки Backend, де є `.env`):
   ```cmd
   cd F:\BUD_office\Backend
   npm run migrate
   ```
   Скрипт виконає всі SQL-файли з `Backend/sql/` у потрібному порядку (див. `Backend/sql/README-MIGRATIONS.md`).

2. **Перевірити підключення до БД** у `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` — мають відповідати тій самій PostgreSQL, до якої підключається Backend при запуску.

3. **Перезапустити Backend** після міграцій:
   ```cmd
   npm run start
   ```
   або `npm run start:dev`.

Після успішного виконання міграцій таблиці `finance_wallets`, `finance_transactions`, `finance_categories`, `execution_tasks`, `execution_task_events`, `foreman_events` тощо будуть створені, і ці розділи мають перестати повертати 500.

---

## Інші типові помилки

| Симптом | Можлива причина | Дія |
|--------|------------------|-----|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Порт 3000 зайнятий | Запустити `Deployment\kill-port-3000.bat` або в `.env` вказати `APP_PORT=3001` |
| 401 Unauthorized на API | Немає/прострочений JWT | Залогінитися знову (сторінка логіну) |
| Помилка підключення до БД при старті | PostgreSQL не запущений або невірні DB_* в `.env` | Запустити PostgreSQL, перевірити `.env` |
