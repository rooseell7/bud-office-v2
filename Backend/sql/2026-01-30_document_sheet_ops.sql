-- FILE: 2026-01-30_document_sheet_ops.sql
-- PostgreSQL
-- Op-log for multi-user Undo/Redo (BLOCK 13).

CREATE TABLE IF NOT EXISTS document_sheet_ops (
  id SERIAL PRIMARY KEY,
  "documentId" INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  "userId" INT NULL,
  type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  "undoGroupId" UUID NULL,
  "isUndone" BOOLEAN NOT NULL DEFAULT FALSE,
  "undoneByOpId" INT NULL REFERENCES document_sheet_ops(id),
  "inverseOfOpId" INT NULL REFERENCES document_sheet_ops(id),
  "clientOpId" UUID NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_ops_doc_user ON document_sheet_ops("documentId", "userId");
CREATE INDEX IF NOT EXISTS idx_sheet_ops_doc_created ON document_sheet_ops("documentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sheet_ops_undone ON document_sheet_ops("documentId", "userId", "isUndone");
