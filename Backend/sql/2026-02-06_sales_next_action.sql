-- OBJECTS REWORK O3: next action fields for sales CRM on projects
-- Run once: psql -f 2026-02-06_sales_next_action.sql

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_due date;

COMMENT ON COLUMN projects.next_action IS 'CRM: опис наступної дії по об''єкту';
COMMENT ON COLUMN projects.next_action_due IS 'CRM: термін виконання наступної дії';
