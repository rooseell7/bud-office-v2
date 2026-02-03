# Changelog: Owner Analytics (Аналітика для власників) — MVP

## Що додано

### Backend

- **Permissions**
  - `analytics:read` — перегляд аналітики (прив’язано до ролей: admin, accountant).
  - `analytics:admin` — зареєстровано в PERMISSIONS (для майбутніх alerts/saved views).

- **Модуль аналітики** (`Backend/src/analytics/`)
  - `analytics-date.helper.ts` — парсинг періоду (from/to), groupBy (day|week|month), SQL date trunc.
  - `analytics.service.ts` — агрегації тільки з існуючих джерел (Finance, Projects, Execution).
  - `analytics.controller.ts` — read-only GET endpoints з guard `analytics:read`.
  - `analytics.module.ts` — підключено до AppModule.

- **Endpoints**
  - `GET /api/analytics/owner/overview?from&to&groupBy` — KPI, cashflow, витрати по категоріях, виручка по об’єктах, розподіли статусів, якість даних.
  - `GET /api/analytics/projects/performance?from&to&status&foremanId&sort` — таблиця ефективності об’єктів.
  - `GET /api/analytics/finance/breakdown?from&to&walletId&projectId` — по гаманцях, категоріях, контрагентах, баланси.
  - `GET /api/analytics/execution/health?from&to&foremanId` — активні/на паузі, прострочені/blocked задачі, tasksByStatus.

### Frontend

- **Меню**
  - Пункт «Аналітика (для власників)» показується тільки при наявності `analytics:read`.
  - Підпункти: Огляд, Об’єкти, Фінанси, Реалізація.

- **Маршрути**
  - `/analytics` — Owner Overview.
  - `/analytics/projects` — ефективність об’єктів (drill-down).
  - `/analytics/finance` — фінансова деталізація.
  - `/analytics/execution` — здоров’я реалізації.

- **Сторінки**
  - `AnalyticsOverviewPage` — KPI-картки, графік Cashflow (IN/OUT), donut витрат по категоріях, bar топ об’єктів по виручці, розподіли статусів об’єктів/задач, блок «Якість даних» з підказками та кнопкою «Показати проблемні записи».
  - `AnalyticsProjectsPage` — таблиця об’єктів з фільтрами (період, статус) та сортуванням; клік по рядку → сторінка об’єкта.
  - `AnalyticsFinancePage` — баланси по гаманцях, рух IN/OUT/NET, витрати по категоріях, топ контрагенти, останні транзакції з посиланням на журнал фінансів.
  - `AnalyticsExecutionPage` — KPI (активні/на паузі/прострочені/blocked), графік задач по статусах, таблиця проблемних об’єктів.

- **Залежність**
  - Додано `recharts` для графіків.

- **API**
  - `Frontend/src/api/analytics.ts` — виклики до всіх analytics endpoints з типізованими DTO.

## Обмеження (не порушено)

- Без змін: router/state/store (лише додані нові routes та пункти меню).
- Без змін: API контракти/DTO/схеми існуючих модулів (КП/Sheet/Акти/Накладні/Склади).
- Не змінювався Frontend/src/sheet та логіка таблиць.
- UI існуючих сторінок не змінювався (окрім додавання drill-down аналітики як нових сторінок).
- Аналітика лише агрегує з існуючих джерел (Фінанси, Реалізація, Об’єкти).
- Єдина валюта в аналітиці — UAH еквівалент.

## Джерела метрик

Див. `Deployment/ANALYTICS-METRIC-SOURCES.md`.

## Регресія

- Існуючі модулі (КП/Акти/Накладні/Sheet/Фінанси/Реалізація) не змінювалися; перевірка — вручну або існуючими тестами.
