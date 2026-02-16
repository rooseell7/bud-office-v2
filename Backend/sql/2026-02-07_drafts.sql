-- STEP 7: Server drafts (autosave for forms)
CREATE TABLE IF NOT EXISTS drafts (
  id BIGSERIAL PRIMARY KEY,
  "userId" INT NOT NULL,
  "scopeType" VARCHAR(32) NOT NULL,
  "projectId" INT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" VARCHAR(128) NULL,
  key VARCHAR(256) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_user_key ON drafts ("userId", key);
CREATE INDEX IF NOT EXISTS idx_drafts_project_entity ON drafts ("projectId", "entityType");
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts ("updatedAt" DESC);
