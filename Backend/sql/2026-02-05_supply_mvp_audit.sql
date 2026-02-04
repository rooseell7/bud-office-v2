-- Supply MVP: requests, orders, receipts, payables, payments, audit_events
-- Attachments: use existing attachments table with entityType='supply_receipt'

-- 1) supply_requests
CREATE TABLE IF NOT EXISTS supply_requests (
  id SERIAL PRIMARY KEY,
  "projectId" INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  "neededAt" DATE,
  comment TEXT,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_requests_project ON supply_requests("projectId");
CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON supply_requests(status);

-- 2) supply_request_items
CREATE TABLE IF NOT EXISTS supply_request_items (
  id SERIAL PRIMARY KEY,
  "requestId" INT NOT NULL REFERENCES supply_requests(id) ON DELETE CASCADE,
  "materialId" INT,
  "customName" VARCHAR(255),
  unit VARCHAR(64) NOT NULL,
  qty NUMERIC(14,4) NOT NULL,
  note TEXT,
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_request_item_material_or_custom CHECK (
    ("materialId" IS NOT NULL AND "customName" IS NULL) OR ("materialId" IS NULL AND "customName" IS NOT NULL AND "customName" <> '')
  )
);
CREATE INDEX IF NOT EXISTS idx_supply_request_items_request ON supply_request_items("requestId");

-- 3) supply_orders
CREATE TABLE IF NOT EXISTS supply_orders (
  id SERIAL PRIMARY KEY,
  "projectId" INT NOT NULL,
  "sourceRequestId" INT REFERENCES supply_requests(id),
  "supplierId" INT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  "deliveryType" VARCHAR(32) NOT NULL DEFAULT 'supplier_to_object',
  "deliveryDatePlanned" DATE,
  "paymentTerms" TEXT,
  comment TEXT,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_orders_project ON supply_orders("projectId");
CREATE INDEX IF NOT EXISTS idx_supply_orders_status ON supply_orders(status);
CREATE INDEX IF NOT EXISTS idx_supply_orders_supplier ON supply_orders("supplierId");

-- 4) supply_order_items
CREATE TABLE IF NOT EXISTS supply_order_items (
  id SERIAL PRIMARY KEY,
  "orderId" INT NOT NULL REFERENCES supply_orders(id) ON DELETE CASCADE,
  "sourceRequestItemId" INT,
  "materialId" INT,
  "customName" VARCHAR(255),
  unit VARCHAR(64) NOT NULL,
  "qtyPlanned" NUMERIC(14,4) NOT NULL,
  "unitPrice" NUMERIC(14,2),
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_order_items_order ON supply_order_items("orderId");

-- 5) supply_receipts
CREATE TABLE IF NOT EXISTS supply_receipts (
  id SERIAL PRIMARY KEY,
  "projectId" INT NOT NULL,
  "sourceOrderId" INT NOT NULL REFERENCES supply_orders(id),
  "supplierId" INT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  "receivedAt" TIMESTAMPTZ,
  "receivedById" INT,
  "docNumber" VARCHAR(64),
  comment TEXT,
  total NUMERIC(14,2),
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_receipts_project ON supply_receipts("projectId");
CREATE INDEX IF NOT EXISTS idx_supply_receipts_order ON supply_receipts("sourceOrderId");
CREATE INDEX IF NOT EXISTS idx_supply_receipts_status ON supply_receipts(status);

-- 6) supply_receipt_items
CREATE TABLE IF NOT EXISTS supply_receipt_items (
  id SERIAL PRIMARY KEY,
  "receiptId" INT NOT NULL REFERENCES supply_receipts(id) ON DELETE CASCADE,
  "sourceOrderItemId" INT,
  "materialId" INT,
  "customName" VARCHAR(255),
  unit VARCHAR(64) NOT NULL,
  "qtyReceived" NUMERIC(14,4) NOT NULL,
  "unitPrice" NUMERIC(14,2),
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_receipt_items_receipt ON supply_receipt_items("receiptId");

-- 7) payables
CREATE TABLE IF NOT EXISTS payables (
  id SERIAL PRIMARY KEY,
  "projectId" INT NOT NULL,
  "supplierId" INT,
  "sourceReceiptId" INT NOT NULL UNIQUE REFERENCES supply_receipts(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount NUMERIC(14,2) NOT NULL,
  "paidAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "dueDate" DATE,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payables_project ON payables("projectId");
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status);

-- 8) payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  "payableId" INT NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  "paidAt" DATE NOT NULL,
  method VARCHAR(16) NOT NULL DEFAULT 'bank',
  comment TEXT,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_payable ON payments("payableId");

-- 9) audit_events
CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" INT NOT NULL,
  action VARCHAR(64) NOT NULL,
  message TEXT,
  meta JSONB,
  "actorId" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events("createdAt" DESC);
