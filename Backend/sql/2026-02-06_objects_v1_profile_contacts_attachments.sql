-- OBJECTS PAGE v1: project profile columns, attachment tag, project_contacts
-- Includes sales_stage/owner_id if 2026-02-06_sales_stage_canonical.sql was not run.

-- Projects: canonical sales (if missing)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sales_stage VARCHAR(32) DEFAULT 'lead_new';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id INT NULL;

-- Projects: new profile columns (skip if column exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city VARCHAR(128);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS finish_class VARCHAR(32);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_start_at DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_end_at DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS access_info JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;
-- userId: make nullable for legacy rows (optional)
-- ALTER TABLE projects ALTER COLUMN "userId" DROP NOT NULL;

-- Attachments: tag for project files (photo_before, contract, etc.)
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS tag VARCHAR(32);

-- Project contacts (contact log)
CREATE TABLE IF NOT EXISTS project_contacts (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL,
  type VARCHAR(32) NOT NULL,
  result TEXT,
  at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id INT
);
CREATE INDEX IF NOT EXISTS idx_project_contacts_project_id ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_at ON project_contacts(at);
