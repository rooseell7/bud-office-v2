-- Activity log for domain events (realtime + Home feed)
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  "actorId" INT NULL,
  entity VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  "entityId" INT NOT NULL,
  "projectId" INT NULL,
  summary VARCHAR(512) NULL,
  payload JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_ts ON activity_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_ts ON activity_log ("projectId", ts DESC);
