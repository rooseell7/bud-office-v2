-- STEP 10: Notifications (inbox + realtime)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  "userId" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  type VARCHAR(64) NOT NULL,
  title VARCHAR(256) NOT NULL,
  body VARCHAR(1024) NULL,
  "projectId" INT NULL,
  "entityType" VARCHAR(64) NULL,
  "entityId" VARCHAR(128) NULL,
  payload JSONB NULL,
  "readAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications ("userId", "readAt", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_project_created ON notifications ("projectId", "createdAt" DESC);
