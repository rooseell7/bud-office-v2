-- Canonical sales stage (source of truth) for projects. O1/O3.
-- Run once: psql -f 2026-02-06_sales_stage_canonical.sql

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS sales_stage VARCHAR(32) DEFAULT 'lead_new',
  ADD COLUMN IF NOT EXISTS owner_id INT NULL;

COMMENT ON COLUMN projects.sales_stage IS 'CRM: canonical stage (lead_new, contact_made, kp_sent, deal_signed, etc.)';
COMMENT ON COLUMN projects.owner_id IS 'CRM: responsible sales person (user id)';

-- Backfill: existing rows get lead_new if null
UPDATE projects SET sales_stage = 'lead_new' WHERE sales_stage IS NULL OR sales_stage = '';
