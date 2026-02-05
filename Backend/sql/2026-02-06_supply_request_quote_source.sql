-- STEP S1: SupplyRequest items source tracking (from quote stages)
-- supply_request_items: sourceType, sourceQuoteId, sourceStageId, sourceQuoteRowId, sourceMaterialFingerprint

ALTER TABLE supply_request_items
  ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "sourceQuoteId" INT NULL,
  ADD COLUMN IF NOT EXISTS "sourceStageId" VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS "sourceQuoteRowId" VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS "sourceMaterialFingerprint" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "sourceStageName" VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_supply_request_items_source_quote ON supply_request_items("sourceQuoteId");
CREATE INDEX IF NOT EXISTS idx_supply_request_items_source_fingerprint ON supply_request_items("sourceMaterialFingerprint");
