-- Outbox: dead-letter and retention support
ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS "deadLetteredAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_dead_letter ON outbox_events ("deadLetteredAt")
  WHERE "deadLetteredAt" IS NOT NULL;
