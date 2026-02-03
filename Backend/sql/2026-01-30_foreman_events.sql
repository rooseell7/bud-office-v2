-- FILE: bud_office-backend/sql/2026-01-30_foreman_events.sql
-- Кабінет виконроба: стрічка подій по об'єкту (project)

CREATE TABLE IF NOT EXISTS foreman_events (
  id SERIAL PRIMARY KEY,
  "objectId" INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  payload JSONB NULL,
  "createdById" INT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foreman_events_object_created ON foreman_events ("objectId", "createdAt");
