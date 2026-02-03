-- FILE: Backend/sql/2026-02-03_finance.sql
-- Відділ фінансів: гаманці, категорії, транзакції

CREATE TABLE IF NOT EXISTS finance_wallets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'cash',
  currency VARCHAR(8) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  details TEXT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  direction VARCHAR(16) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(16) NOT NULL,
  date DATE NOT NULL,
  "walletId" INT NULL,
  "fromWalletId" INT NULL,
  "toWalletId" INT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  "fxRate" NUMERIC(12,6) NULL,
  "amountUAH" NUMERIC(18,2) NULL,
  "projectId" INT NULL,
  "categoryId" INT NULL,
  counterparty VARCHAR(512) NULL,
  comment TEXT NULL,
  "createdById" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date_id ON finance_transactions (date, id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_wallet_date ON finance_transactions ("walletId", date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_project_date ON finance_transactions ("projectId", date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_from_date ON finance_transactions ("fromWalletId", date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_to_date ON finance_transactions ("toWalletId", date);

-- Seed categories (MVP) — ідемпотентно
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Оплата від замовника', 'in', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Оплата від замовника');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Повернення', 'in', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Повернення');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Інше (прихід)', 'in', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Інше (прихід)');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Роботи', 'out', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Роботи');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Матеріали', 'out', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Матеріали');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Офіс', 'out', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Офіс');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Ризики/Втрати', 'out', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Ризики/Втрати');
INSERT INTO finance_categories (name, direction, "isActive")
SELECT 'Інше (витрата)', 'out', true WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE name = 'Інше (витрата)');
