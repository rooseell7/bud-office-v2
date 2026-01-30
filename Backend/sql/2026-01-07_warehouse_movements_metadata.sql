-- FILE: bud_office-backend/sql/2026-01-07_warehouse_movements_metadata.sql
-- PostgreSQL
-- Додає UI-метадані до warehouse_movements (для UX операцій складу та інтеграції з накладними).

ALTER TABLE IF EXISTS warehouse_movements
  ADD COLUMN IF NOT EXISTS "docNo" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "objectName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "counterpartyName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS note TEXT;
