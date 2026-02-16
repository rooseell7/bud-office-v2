# BUD Office — правила та обмеження

Коротко: що робить проєкт і які заборони/правила прописані в коді та документації.

---

## Що ми робимо (проєкт)

**BUD Office** (Buduy CRM) — офісний/CRM застосунок для будівельної компанії:

- **Backend** (NestJS): API, авторизація, ролі, права, документообіг, склади, кошториси, акти, аналітика, колаборація (WebSocket).
- **Frontend** (React + Vite): клієнти, проєкти, об’єкти, етапи, кошториси (КП), акти, накладні, склади, матеріали, постачальники, виконроби, фінанси, аналітика.
- **Sheet** — табличний редактор (типу spreadsheet) для документів, кошторисів, актів тощо.

Ролі: `admin`, `foreman`, `supply_head`, `supply_manager`, `estimator`, `sales_head`, `sales_manager_head`, `delivery_head`, `delivery_manager`, `accountant`, `viewer`.

---

## Заборони та обмеження (що прописано в проєкті)

### 1. Доступ (403 — Немає доступу)

- **Backend:** `PermissionsGuard` перевіряє права користувача. Якщо для ендпоінта потрібен один із дозволів (`@Permissions(...)`), а в користувача його немає — кидається `ForbiddenException` з текстом *«Недостатньо прав доступу»*.
- **Окремо:** для операції TRANSFER по складах потрібен дозвіл `warehouse:transfer`, інакше — `ForbiddenException('Для TRANSFER потрібен дозвіл warehouse:transfer')`.
- **Frontend:** сторінка `/403` (`ForbiddenPage`) показує *«403 — Немає доступу»* і *«У вас недостатньо прав для перегляду цієї сторінки»*.

### 2. Дозволи (permissions) — Source of Truth

Файл: `Backend/src/auth/permissions/permissions.ts`.  
Список дозволів: `system:manage`, `users:read/write`, `roles:read/write`, `warehouse:*`, `supply:*`, `sales:*`, `materials/units/suppliers:*`, `projects/objects:*`, `delivery:*`, `documents:*`, `estimates:*`, `sheet:*`, `execution:*`, `foreman:*`, `finance:*`, `analytics:*`.  
Ролі мапляться на набори цих дозволів; без потрібного дозволу дія заборонена.

### 3. Бізнес-правила (що «не можна»)

- **Етапи кошторису:** не можна видалити останній етап (`estimates.service.ts`: *«Не можна видалити останній етап»*).
- **Колонки в таблиці (sheet):** захищені колонки не можна видалити — повідомлення *«Колонку не можна видалити»* (`Grid.tsx`).
- **Редагування накладних:** узгоджено з правилами — можна редагувати лише якщо `canEdit && !isLocked` (`InvoiceDetailsPage.tsx`).
- **Видалення клієнта / етапу:** підтвердження *«Дію не можна буде скасувати»* (`ClientsPage`, `StagesPage`).
- **Діалог видалення (оцінка):** *«Цю дію не можна скасувати»* (`EstimateIndexPage`).

### 4. Safe-save правила (акти, v1)

- Рядки з порожнім `name` ігноруються.
- `qty`/`price` можуть бути 0.
- `amount` і `totalAmount` завжди перераховуються на сервері.

### 5. Інше

- **Глобальний zoom:** у типографіці (variant3.css) закоментовано *«заборонити глобальний zoom»* — можна використовувати для обмеження масштабу в UI.
- **Firewall / Nginx:** у Deployment описано правила фаєрволу (порт 80, 3000) та блокування/дозвіли для доступу до сервера; для WebSocket (`/socket.io/`) має бути коректний блок у Nginx.

---

## Де це живеться в коді

| Що | Де |
|----|-----|
| Перевірка прав на API | `Backend/src/auth/guards/permissions.guard.ts` |
| Список дозволів і ролей | `Backend/src/auth/permissions/permissions.ts` |
| 403 сторінка | `Frontend/src/pages/ForbiddenPage.tsx` |
| Заборона TRANSFER без дозволу | `Backend/src/warehouses/warehouses.controller.ts` |
| Останній етап не видаляти | `Backend/src/estimates/estimates.service.ts` |
| Захищені колонки sheet | `Frontend/src/sheet/ui/Grid.tsx` |
| Safe-save актів | `Backend/README_ACTS_STEP1_V1.md` |

### Layout та навігація

| Компонент | Роль | Використання |
|-----------|------|--------------|
| `Frontend/src/modules/layout/MainLayout.tsx` | Основний layout | Активний. Використовується в `App.tsx` для маршрутів `/`, `/admin`. Структура меню в `navGroups`. |
| `Frontend/src/layouts/AppLayout.tsx` + `Sidebar.tsx` | Legacy layout | Використовується тільки в `_legacy_routes/AppRoutes.tsx`. Не змінювати без явної згоди. |

**Канонічна структура меню:** `MainLayout.tsx`, масив `navGroups`. Версія «v2.1 — структура меню затверджена» — не змінювати без узгодження.

### Бекапи та безпека

- **Git** — основний механізм версіонування. Регулярно робити commit і push.
- **ZIP-архіви** — створюються `Deployment/make-backup.ps1`, зберігаються в `_backups/` (папка в .gitignore).
- **Cursor snapshots** — внутрішній стан IDE. **Не вважати їх бекапом проєкту.** Для збереження роботи використовувати Git і ZIP-бекапи.

---

У проєкті **немає** окремого файлу типу `AGENTS.md` або `.cursor/rules` — усі заборони та правила розкидані по коді та цих документах; цей файл їх збирає в одному місці.
