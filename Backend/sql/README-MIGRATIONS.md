# Міграції БД (PostgreSQL)

Усі зміни схеми виконуються **ручними SQL-файлами** у цій папці. TypeORM `migrationsRun` у проєкті вимкнено.

## Порядок застосування (обовʼязковий)

Застосовуйте файли **строго в такому порядку** (за датою та залежностями):

| № | Файл | Опис |
|---|------|------|
| 1 | `2025-12-27_warehouse_movement_drafts.sql` | Чернетки рухів складу |
| 2 | `2025-12-30_attachments_foundation.sql` | Таблиця вкладень |
| 3 | `2025-12-30_documents_foundation.sql` | Документи + document_events |
| 4 | `2026-01-05_materials_consumption.sql` | Споживання матеріалів |
| 5 | `2026-01-06_invoices_internal_columns.sql` | Внутрішні колонки накладних |
| 6 | `2026-01-07_materials_weight.sql` | Вага матеріалів |
| 7 | `2026-01-07_warehouse_movements_metadata.sql` | Метадані рухів складу |
| 8 | `2026-01-30_document_sheet_ops.sql` | Операції листа документа |
| 9 | `2026-01-30_foreman_events.sql` | Події виконроба (стрічка по обʼєкту) |
| 10 | `2026-01-30_sheet_snapshots.sql` | Знімки листів |
| 11 | `2026-02-03_finance.sql` | Фінанси: гаманці, категорії, транзакції |
| 12 | `2026-02-03_execution_tasks.sql` | Відділ реалізації: задачі + події по задачах |
| 13 | `2026-02-04_activity_log.sql` | Журнал активності (audit) |
| 14 | `2026-02-05_supply_mvp_audit.sql` | Supply MVP: audit-таблиця, замовлення, приходи, payables |
| 15 | `2026-02-05_supply_request_templates.sql` | Шаблони заявок на постачання (supply_request_templates, supply_request_template_items) |
| 16 | `2026-02-05_supply_receipt_substitutions.sql` | Заміни матеріалів у приходах (isSubstitution, original*, substitute*, substitutionReason) |
| 17 | `2026-02-06_objects_v1_profile_contacts_attachments.sql` | Objects v1: project profile (city, area_m2, tags, access_info, notes), attachments.tag, project_contacts |
| 18 | `2026-02-06_clients_object_id.sql` | Клієнти: прив'язка до об'єкта (object_id), зберігається на сервері |
| 19 | `2026-02-06_audit_log_outbox.sql` | audit_log (журнал дій), outbox_events (outbox для realtime bo:invalidate) |
| 20 | `2026-02-07_outbox_dead_letter_retention.sql` | outbox_events.deadLetteredAt (DLQ) |

Після додавання **нового** SQL-файлу — допишіть його в цю таблицю в кінець і збережіть порядок при наступному запуску міграцій.

## Як застосувати

### Варіант A: скрипт з кореня Backend

З папки `Backend` (де лежить `.env`):

```bash
npm run migrate
```

або вручну:

```bash
node tools/run-migrations.mjs
```

Скрипт підхоплює `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` з `.env` і виконує кожен файл зі списку вище по черзі.

### Варіант B: psql вручну

Якщо є клієнт `psql`:

```bash
cd Backend/sql
set PGPASSWORD=your_db_pass
psql -h localhost -p 5432 -U postgres -d buduy_crm -f 2025-12-27_warehouse_movement_drafts.sql
psql -h localhost -p 5432 -U postgres -d buduy_crm -f 2025-12-30_attachments_foundation.sql
# ... далі по списку по черзі
```

На Linux/macOS:

```bash
export PGPASSWORD=your_db_pass
for f in 2025-12-27_warehouse_movement_drafts.sql 2025-12-30_attachments_foundation.sql 2025-12-30_documents_foundation.sql 2026-01-05_materials_consumption.sql 2026-01-06_invoices_internal_columns.sql 2026-01-07_materials_weight.sql 2026-01-07_warehouse_movements_metadata.sql 2026-01-30_document_sheet_ops.sql 2026-01-30_foreman_events.sql 2026-01-30_sheet_snapshots.sql 2026-02-03_finance.sql 2026-02-03_execution_tasks.sql; do
  psql -h localhost -p 5432 -U postgres -d buduy_crm -f "$f" || exit 1
done
```

## Помилка «треба бути власником таблиці warehouse_movement_drafts»

Якщо `npm run migrate` падає з таким текстом, таблицю створив інший користувач (наприклад postgres), а міграції запускаються під **DB_USER** з `.env`. Потрібно один раз передати власність таблиці саме **DB_USER** (це роль/користувач у PostgreSQL, не назва бази).

```powershell
# PowerShell: підключись як суперюзер postgres; заміни YOUR_DB_USER на значення DB_USER з .env, DB_NAME — назва бази
$env:PGPASSWORD = 'пароль_суперюзера_postgres'
psql -h localhost -U postgres -d DB_NAME -c "ALTER TABLE warehouse_movement_drafts OWNER TO YOUR_DB_USER;"
```

**Приклад:** якщо в `.env` є `DB_USER=buduy`, `DB_NAME=bud_office`:

```powershell
psql -h localhost -U postgres -d bud_office -c "ALTER TABLE warehouse_movement_drafts OWNER TO buduy;"
```

(Пароль postgres потрібно ввести при запиті або задати `$env:PGPASSWORD`.)

### Якщо не знаєте пароль користувача postgres

Змінити власника може лише поточний власник таблиці або суперюзер. Якщо пароль postgres невідомий, можна **один раз** дозволити локальне підключення без пароля:

1. Знайди файл `pg_hba.conf` (на Windows часто: `C:\Program Files\PostgreSQL\<версія>\data\pg_hba.conf`).
2. Зроби резервну копію: скопіюй файл, наприклад, в `pg_hba.conf.bak`.
3. У `pg_hba.conf` знайди рядки для `localhost` / `127.0.0.1` з методом `scram-sha-256` або `md5` і **тимчасово** заміни метод на `trust` для IPv4 та IPv6, наприклад:
   ```
   host    all    all    127.0.0.1/32    trust
   host    all    all    ::1/128         trust
   ```
4. Перезапусти службу PostgreSQL (Services → PostgreSQL → Restart).
5. У PowerShell виконай (підстав свій DB_USER та DB_NAME з `.env`):
   ```powershell
   psql -h localhost -U postgres -d bud_office -c "ALTER TABLE warehouse_movement_drafts OWNER TO buduy;"
   ```
   Пароль вводити не потрібно.
6. Поверни в `pg_hba.conf` попередні значення (scram-sha-256 або md5), збережи файл, знову перезапусти PostgreSQL.

Детальніше: коментарі в `sql/fix-ownership-warehouse_drafts.sql`.

## Якщо у додатку «Internal server error» на Фінансах / Реалізації / Виконроб / Аналітиці

Часто це означає, що таблиці БД ще не створені. Застосуй міграції (`npm run migrate` з папки Backend) і перезапусти Backend. Детальніше: `Backend/TROUBLESHOOTING.md`.

---

## Примітки

- Усі скрипти використовують `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, тому повторний запуск безпечний (ідемпотентність де можливо).
- FK (foreign keys) у міграціях навмисно не додаються, щоб не ламати існуючі схеми та розгортання.
- **Аналітика** не потребує окремих міграцій — використовує тільки існуючі таблиці (finance_*, projects, execution_tasks тощо).
- Нові типи подій у `foreman_events` (наприклад `TASK_CREATED`, `TASK_STATUS_CHANGE`, `TASK_COMMENT`) зберігаються в колонці `type VARCHAR(64)` — додаткових змін схеми не потрібно.
