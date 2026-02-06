-- One active next action per project (sales CRM). O3.
CREATE TABLE IF NOT EXISTS project_next_actions (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  due_at DATE NOT NULL,
  note TEXT,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "actorId" INT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_next_actions_project_active
  ON project_next_actions (project_id) WHERE completed_at IS NULL;

COMMENT ON TABLE project_next_actions IS 'CRM: one active next action per project (completed_at IS NULL)';
