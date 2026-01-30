-- Adds material consumption norms for preliminary calculations
ALTER TABLE IF EXISTS materials
  ADD COLUMN IF NOT EXISTS "consumptionPerM2" numeric(12,4) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS materials
  ADD COLUMN IF NOT EXISTS "consumptionPerLm" numeric(12,4) NOT NULL DEFAULT 0;
