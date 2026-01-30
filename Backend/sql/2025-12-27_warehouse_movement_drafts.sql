-- FILE: bud_office-backend/sql/2025-12-27_warehouse_movement_drafts.sql
-- PostgreSQL
-- Таблиця чернеток операцій складу (autosave з фронту)

CREATE TABLE IF NOT EXISTS warehouse_movement_drafts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Один активний draft на (user_id, warehouse_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouse_movement_drafts_user_wh
  ON warehouse_movement_drafts(user_id, warehouse_id);

-- Тригер оновлення updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_warehouse_movement_drafts') THEN
    CREATE OR REPLACE FUNCTION set_updated_at_warehouse_movement_drafts()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END
    $fn$ LANGUAGE plpgsql;
  END IF;
END$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_warehouse_movement_drafts ON warehouse_movement_drafts;
CREATE TRIGGER trg_set_updated_at_warehouse_movement_drafts
BEFORE UPDATE ON warehouse_movement_drafts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_warehouse_movement_drafts();