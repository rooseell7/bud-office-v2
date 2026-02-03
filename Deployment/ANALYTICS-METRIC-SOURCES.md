# Джерела метрик аналітики (Owner Analytics)

Усі показники беруться лише з існуючих сутностей і таблиць. Нічого не вигадано.

## Фінанси (Finance)

| Метрика | Джерело |
|--------|---------|
| **incomeUAH** (виручка) | Сума `Transaction.amountUAH` (або `amount`) за період, де `Transaction.type = 'in'`. |
| **expenseUAH** (витрати) | Сума по транзакціях з `type = 'out'` за період. |
| **netUAH** | incomeUAH − expenseUAH. |
| **cashOnHandUAH** | Сума поточних балансів усіх активних гаманців у UAH (рахунок по `Transaction`: in/out/transfer по `walletId` / `fromWalletId` / `toWalletId`). |
| **Cashflow series** | Групування транзакцій по даті (day/week/month) через `analytics-date.helper`; по кожному bucket — SUM(IN), SUM(OUT). |
| **Expense by category** | Транзакції OUT за період, JOIN Category; GROUP BY categoryId; SUM(amountUAH). |
| **Revenue by project** | Транзакції IN за період з `projectId IS NOT NULL`, JOIN Project; GROUP BY projectId; TOP 10 по сумі. |
| **By wallet / balances** | Ті самі транзакції, розбиті по `Wallet`; баланс = сума in − out + transfer in − transfer out по кожному гаманцю. |
| **Top counterparties** | Транзакції з заповненим `counterparty`, GROUP BY counterparty, SUM(amountUAH), LIMIT 15. |

## Об’єкти (Projects)

| Метрика | Джерело |
|--------|---------|
| **activeProjectsCount** | `Project.status = 'in_progress'`, COUNT. |
| **projectStatusDistribution** | GROUP BY `Project.status`, COUNT. |
| **projectsWithoutForemanPct** | Відсоток проектів з `foremanId IS NULL` (Data quality). |
| **Project performance list** | Список проектів з фільтрами (status, foremanId); по кожному — суми IN/OUT за період з `Transaction`, плюс open/blocked/overdue з `ExecutionTask`. |

## Реалізація (Execution)

| Метрика | Джерело |
|--------|---------|
| **overdueTasksCount** | `ExecutionTask`: статус NEW/IN_PROGRESS/BLOCKED, `dueDate IS NOT NULL` і `dueDate < CURRENT_DATE`, COUNT. |
| **blockedTasksCount** | `ExecutionTask.status = 'blocked'`, COUNT. |
| **taskStatusDistribution** | GROUP BY `ExecutionTask.status`, COUNT. |
| **openTasksCount (по об’єкту)** | Задача з статусом NEW або IN_PROGRESS по projectId. |
| **Data quality: tasksWithoutDueDatePct** | Відсоток задач з `dueDate IS NULL`. |
| **topBlockedReasons** | Поки порожній масив (якщо з’явиться поле причини блокування — можна додати агрегацію). |

## Якість даних (Data quality)

| Показник | Джерело |
|----------|--------|
| **transactionsWithoutProjectPct** | Відсоток транзакцій IN/OUT з `projectId IS NULL`. |
| **transactionsWithoutCategoryPct** | Відсоток витрат (OUT) без категорії (`categoryId IS NULL` або 0). |
| **tasksWithoutDueDatePct** | Відсоток задач без `dueDate`. |
| **projectsWithoutForemanPct** | Відсоток проектів без виконроба. |
| **stagesWithoutDatesPct** | Зарезервовано; якщо в Stage з’являться дати — можна підключити. Зараз = 0. |

## Валюта

Усі грошові значення в аналітиці — в **UAH еквіваленті** (поле `amountUAH` у транзакціях або розрахунок через нього). Оригінал (currency/amount) у вихідних модулях не змінювався.
