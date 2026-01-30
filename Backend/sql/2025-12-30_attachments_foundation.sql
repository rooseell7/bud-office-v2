-- FILE: bud_office-backend/sql/2025-12-30_attachments_foundation.sql
-- v2.1 — Attachments foundation (restores /api/attachments/upload)

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" INT NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  path VARCHAR(512) NOT NULL,
  "uploadedByUserId" VARCHAR(64) NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments ("entityType", "entityId");

-- Якщо таблиця існувала раніше з неповною схемою (наприклад, без колонки path),
-- додайте відсутні колонки безпечно.
-- Рекомендовано виконати весь файл повторно.

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS path VARCHAR(512);

-- Якщо path був доданий як nullable у старій БД — нормалізуємо під поточну entity.
UPDATE attachments SET path = '' WHERE path IS NULL;
ALTER TABLE attachments ALTER COLUMN path SET NOT NULL;
