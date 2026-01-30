-- Documents foundation (v2.1)
-- Таблиці: documents, document_events
-- Без FK на users/invoices/etc, щоб не ламати існуючі схеми при розгортаннях.

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  number VARCHAR(64) NULL,
  documentDate DATE NULL,
  projectId INT NULL,
  sourceType VARCHAR(64) NULL,
  sourceId INT NULL,
  total NUMERIC(14,2) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'UAH',
  meta JSONB NULL,
  createdById INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type, status);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(sourceType, sourceId);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(projectId);

CREATE TABLE IF NOT EXISTS document_events (
  id SERIAL PRIMARY KEY,
  documentId INT NOT NULL,
  action VARCHAR(64) NOT NULL,
  payload JSONB NULL,
  userId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_events_doc_created ON document_events(documentId, createdAt);

-- Опційно: тригер для documents.updatedAt (якщо потрібно)
-- CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updatedAt = now();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DO $$ BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_trigger WHERE tgname = 'tr_documents_updated_at'
--   ) THEN
--     CREATE TRIGGER tr_documents_updated_at
--     BEFORE UPDATE ON documents
--     FOR EACH ROW
--     EXECUTE PROCEDURE set_updated_at();
--   END IF;
-- END $$;
