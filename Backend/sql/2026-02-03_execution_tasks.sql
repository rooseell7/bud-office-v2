-- FILE: Backend/sql/2026-02-03_execution_tasks.sql
-- Відділ реалізації: задачі + події по задачах (єдиний контур з foreman_events для timeline)

CREATE TABLE IF NOT EXISTS execution_tasks (
  id SERIAL PRIMARY KEY,
  "projectId" INT NOT NULL,
  "stageId" INT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT NULL,
  "assigneeId" INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  "dueDate" DATE NULL,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_tasks_project_created ON execution_tasks ("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_execution_tasks_assignee_project ON execution_tasks ("assigneeId", "projectId");
CREATE INDEX IF NOT EXISTS idx_execution_tasks_status ON execution_tasks (status);

CREATE TABLE IF NOT EXISTS execution_task_events (
  id SERIAL PRIMARY KEY,
  "taskId" INT NOT NULL,
  type VARCHAR(32) NOT NULL,
  payload JSONB NULL,
  "createdById" INT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_task_events_task_created ON execution_task_events ("taskId", "createdAt");
