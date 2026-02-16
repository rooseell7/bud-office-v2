-- Global audit log (all actions: create/update/delete/status/approve)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actorUserId" INT NOT NULL,
  action VARCHAR(128) NOT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" VARCHAR(128) NOT NULL,
  "projectId" INT NULL,
  before JSONB NULL,
  after JSONB NULL,
  meta JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_log_project_created ON audit_log ("projectId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created ON audit_log ("actorUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

-- Outbox for reliable realtime (emit after commit, publisher sends bo:invalidate)
CREATE TABLE IF NOT EXISTS outbox_events (
  id BIGSERIAL PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "publishedAt" TIMESTAMPTZ NULL,
  "attemptCount" INT NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ NULL,
  "eventType" VARCHAR(64) NOT NULL,
  "scopeType" VARCHAR(32) NOT NULL,
  "scopeId" INT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  "actorUserId" INT NULL,
  "clientOpId" UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_publish ON outbox_events ("publishedAt", "nextAttemptAt", "createdAt")
  WHERE "publishedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_scope ON outbox_events ("scopeType", "scopeId", id);
CREATE INDEX IF NOT EXISTS idx_outbox_client_op ON outbox_events ("clientOpId") WHERE "clientOpId" IS NOT NULL;
