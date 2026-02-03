#!/usr/bin/env node
/**
 * Застосовує SQL-міграції з Backend/sql у строгому порядку.
 * Змінні оточення: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME (або з .env у корені Backend).
 * Запуск: з папки Backend: node tools/run-migrations.mjs
 * Опція: node tools/run-migrations.mjs --from 2026-02-03_finance.sql  — виконати лише з цього файлу (включно).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const MIGRATIONS_ORDER = [
  '2025-12-27_warehouse_movement_drafts.sql',
  '2025-12-30_attachments_foundation.sql',
  '2025-12-30_documents_foundation.sql',
  '2026-01-05_materials_consumption.sql',
  '2026-01-06_invoices_internal_columns.sql',
  '2026-01-07_materials_weight.sql',
  '2026-01-07_warehouse_movements_metadata.sql',
  '2026-01-30_document_sheet_ops.sql',
  '2026-01-30_foreman_events.sql',
  '2026-01-30_sheet_snapshots.sql',
  '2026-02-03_finance.sql',
  '2026-02-03_execution_tasks.sql',
];

function loadEnv() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

function getConfig() {
  loadEnv();
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'buduy_crm';
  return { host, port, user, password, database };
}

async function run() {
  const config = getConfig();
  const cwd = process.cwd();
  const sqlDir = path.join(cwd, 'sql');

  console.log('DB:', config.host + ':' + config.port + '/' + config.database);
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('Помилка підключення до БД:', err.message);
    process.exit(1);
  }

  const fromArg = process.argv.find((a) => a.startsWith('--from='));
  const fromFile = fromArg ? fromArg.slice(7).trim() : null;
  const startIdx = fromFile ? MIGRATIONS_ORDER.indexOf(fromFile) : 0;
  const toRun = startIdx >= 0 ? MIGRATIONS_ORDER.slice(startIdx) : MIGRATIONS_ORDER;
  if (fromFile && startIdx < 0) {
    console.warn('Файл --from не знайдено в списку, виконую всі.');
  } else if (fromFile) {
    console.log('Виконую міграції починаючи з:', fromFile);
  }

  for (const file of toRun) {
    const filePath = path.join(sqlDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn('Пропуск (файл не знайдено):', file);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log('OK:', file);
    } catch (err) {
      console.error('Помилка у файлі', file + ':', err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('Міграції застосовано.');
}

run();
