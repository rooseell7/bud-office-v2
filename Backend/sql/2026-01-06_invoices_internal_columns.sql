-- BUD_OFFICE v2.1
-- Internal invoices: add metadata to invoices table.
-- Safe to run multiple times.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS type varchar(16) NOT NULL DEFAULT 'external';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS internalDirection varchar(8) NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS warehouseId int NULL;
