-- STEP 1.6: Substitutions (заміни матеріалу в приході)
-- supply_receipt_items: isSubstitution, original*, substitute*, substitutionReason

ALTER TABLE supply_receipt_items
  ADD COLUMN IF NOT EXISTS "isSubstitution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "originalMaterialId" INT NULL,
  ADD COLUMN IF NOT EXISTS "originalCustomName" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "substituteMaterialId" INT NULL,
  ADD COLUMN IF NOT EXISTS "substituteCustomName" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "substitutionReason" TEXT NULL;
