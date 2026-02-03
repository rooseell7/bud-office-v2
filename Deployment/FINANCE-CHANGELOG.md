# Changelog: Відділ фінансів (Finance module)

## Канонічно встановлено

- **Об'єкт:** сутність **Project** (таблиця `projects`), **id — number**. У фінансах використовується `projectId` для прив'язки транзакцій до об'єкта.

---

## Phase 1 — MVP: Гаманці + Транзакції + Баланси + FX

### Backend

**Permissions**
- Додано `finance:read`, `finance:write`, `finance:admin`.
- Роль `accountant`: finance:read, finance:write.
- Роль `admin`: усі права (включно finance:admin).
- Створення/редагування гаманців: `finance:write` або `finance:admin`.

**Модель даних**
- **Wallet** (`finance_wallets`): id, name, type (cash|fop|bank), currency, isActive, details, timestamps.
- **Category** (`finance_categories`): id, name, direction (in|out|both), isActive, createdAt. Seed: 8 категорій (прихід/витрата).
- **Transaction** (`finance_transactions`): id, type (in|out|transfer), date, walletId/fromWalletId/toWalletId, amount, currency, fxRate, amountUAH, projectId, categoryId, counterparty, comment, createdById, timestamps.

**API**
- `GET /finance/wallets` — список гаманців (опційно ?all=1 для неактивних).
- `POST /finance/wallets` — створити гаманець.
- `PATCH /finance/wallets/:id` — оновити гаманець.
- `GET /finance/categories` — категорії (?direction=in|out).
- `GET /finance/balances` — баланси по кожному гаманцю (UAH + в оригінальній валюті).
- `GET /finance/transactions` — журнал (фільтри: fromDate, toDate, walletId, projectId, categoryId, type; limit/offset).
- `POST /finance/transactions/in` — прихід.
- `POST /finance/transactions/out` — витрата.
- `POST /finance/transactions/transfer` — переказ між гаманцями.
- `PATCH /finance/transactions/:id` — редагувати транзакцію.
- `GET /finance/projects/:id/summary` — підсумок по об'єкту (inUAH, outUAH, balanceUAH).

**Міграція**
- `Backend/sql/2026-02-03_finance.sql` — таблиці + seed категорій.

### Frontend

**Меню та роути**
- Пункт меню «Фінанси» (Відділ фінансів) видимий при `finance:read`, посилання на `/finance`.
- Роути: `/finance` (дашборд), `/finance/wallets` (гаманці).

**Сторінки**
- **FinanceDashboardPage** (`/finance`): блок «Баланси» (картки гаманців + разом UAH), кнопки «Отримали гроші» / «Оплатили» / «Переказ між гаманцями», журнал операцій з фільтрами (період, гаманець, тип), кнопка «Гаманці» → `/finance/wallets`.
- **FinanceWalletsPage** (`/finance/wallets`): список гаманців, кнопка «Додати ФОП/гаманець», редагування (назва, тип, валюта, активність, реквізити).

**Модалки**
- **TransactionInModal** — прихід (дата, гаманець, сума, валюта, курс, об'єкт, категорія, контрагент, коментар).
- **TransactionOutModal** — витрата (аналогічно).
- **TransactionTransferModal** — переказ (з/в гаманець, сума, валюта, курс, коментар).

---

## Phase 2 — Інтеграція з об'єктами

- На **ProjectDetailsPage** додано вкладку **«Фінанси»** (тільки при `finance:read`).
- У вкладці: прихід/витрата/баланс по об'єкту (UAH), кнопки «+ Отримали гроші (для цього обʼєкта)» та «– Оплатили (для цього обʼєкта)», таблиця останніх операцій по об'єкту.
- Транзакції створюються з `projectId = objectId`; підсумок через `GET /finance/projects/:id/summary`.

---

## Список змінених/нових файлів

### Backend (нові)
- `Backend/src/finance/wallet.entity.ts`
- `Backend/src/finance/category.entity.ts`
- `Backend/src/finance/transaction.entity.ts`
- `Backend/src/finance/finance.service.ts`
- `Backend/src/finance/finance.controller.ts`
- `Backend/src/finance/finance.module.ts`
- `Backend/src/finance/dto/create-wallet.dto.ts`
- `Backend/src/finance/dto/update-wallet.dto.ts`
- `Backend/src/finance/dto/create-transaction-in.dto.ts`
- `Backend/src/finance/dto/create-transaction-out.dto.ts`
- `Backend/src/finance/dto/create-transaction-transfer.dto.ts`
- `Backend/src/finance/dto/update-transaction.dto.ts`
- `Backend/sql/2026-02-03_finance.sql`

### Backend (змінені)
- `Backend/src/auth/permissions/permissions.ts` — додано finance:read, finance:write, finance:admin; роль accountant.
- `Backend/src/app.module.ts` — підключено FinanceModule.

### Frontend (нові)
- `Frontend/src/api/finance.ts`
- `Frontend/src/modules/finance/pages/FinanceDashboardPage.tsx`
- `Frontend/src/modules/finance/pages/FinanceWalletsPage.tsx`
- `Frontend/src/modules/finance/components/TransactionInModal.tsx`
- `Frontend/src/modules/finance/components/TransactionOutModal.tsx`
- `Frontend/src/modules/finance/components/TransactionTransferModal.tsx`

### Frontend (змінені)
- `Frontend/src/App.tsx` — роути /finance, /finance/wallets.
- `Frontend/src/modules/layout/MainLayout.tsx` — пункт «Фінанси», фільтр за finance:read.
- `Frontend/src/modules/projects/ProjectDetailsPage.tsx` — вкладка «Фінанси», підсумок та операції по об'єкту, модалки IN/OUT з projectId.

---

## Phase 3 (не реалізовано)

- Оплати по документах (Накладні/Акти), зв'язок transaction ↔ document, paymentStatus на документах — за ТЗ робити лише після MVP.
