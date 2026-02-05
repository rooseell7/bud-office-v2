-- Supply MVP+: request templates (шаблони заявок)
-- supply_request_templates, supply_request_template_items

CREATE TABLE IF NOT EXISTS supply_request_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "projectId" INT NULL,
  "createdById" INT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_request_templates_project ON supply_request_templates("projectId");
CREATE INDEX IF NOT EXISTS idx_supply_request_templates_active ON supply_request_templates("isActive");

CREATE TABLE IF NOT EXISTS supply_request_template_items (
  id SERIAL PRIMARY KEY,
  "templateId" INT NOT NULL REFERENCES supply_request_templates(id) ON DELETE CASCADE,
  "materialId" INT NULL,
  "customName" VARCHAR(255) NULL,
  unit VARCHAR(64) NOT NULL,
  "qtyDefault" NUMERIC(14,4) NOT NULL DEFAULT 0,
  note TEXT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_template_item_material_or_custom CHECK (
    ("materialId" IS NOT NULL AND ("customName" IS NULL OR "customName" = '')) OR ("materialId" IS NULL AND "customName" IS NOT NULL AND "customName" <> '')
  )
);
CREATE INDEX IF NOT EXISTS idx_supply_request_template_items_template ON supply_request_template_items("templateId");
