# Delivery → Акти (КРОК 1 / Backend v1)

Цей ZIP містить **мінімальний, стабільний бекенд** для роботи над UX актів у Buduy CRM / BUD_OFFICE v2.1.

## Що входить у v1

### Модель
**delivery_acts**
- `id, projectId, stageId, number, date`
- `status: 'draft' | 'done'` (default `draft`)
- `comment: string | null`
- `totalAmount` (numeric(14,2))
- `userId, createdAt, updatedAt`

**delivery_act_items** (v1)
- `id, actId, name, unit, qty, price, amount`

> v1 **не містить** %/subtotal/секцій. Це буде окремим кроком (КРОК 1.1) після прийняття цього ZIP.

## Endpoints
База: `/api/delivery`

- `GET /acts?projectId=...` — список актів (з items)
- `GET /acts/:id` — один акт
- `POST /acts` — створення акту
- `PATCH /acts/:id` — safe-save (можна надсилати порожні рядки, items перезаписуються)
- `DELETE /acts/:id` — видалення

## Safe-save правила (v1)
- `items` можуть бути відсутні.
- Рядки з порожнім `name` **ігноруються**.
- `qty/price` допускають `0`.
- `amount` і `totalAmount` завжди перераховуються на сервері.

## Примітка про БД
Додані колонки в `delivery_acts`: `status`, `comment`.
Якщо у вас вимкнений `synchronize`, потрібно додати ці колонки міграцією.
