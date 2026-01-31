-- FILE: 2026-01-30_sheet_snapshots.sql
-- PostgreSQL
-- Snapshots for fast resync (BLOCK 14).

CREATE TABLE IF NOT EXISTS sheet_snapshots (
  id SERIAL PRIMARY KEY,
  "documentId" INT NOT NULL,
  version INT NOT NULL,
  "lastOpId" INT NULL,
  snapshot JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_snapshots_doc ON sheet_snapshots("documentId");
CREATE INDEX IF NOT EXISTS idx_sheet_snapshots_doc_version ON sheet_snapshots("documentId", version DESC);
