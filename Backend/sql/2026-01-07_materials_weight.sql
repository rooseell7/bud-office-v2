-- Adds optional material weight column (kg per unit)
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS "weightKg" numeric(12,3);
