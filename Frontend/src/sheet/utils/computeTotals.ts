/**
 * Compute sheet totals for КП (sum, cost, profit).
 * Used for per-tab and per-stage summaries.
 */

import type { LocaleSettings } from '../configs/types';
import { parseNumericCell } from '../engine/number/parseCellValue';

export type SheetTotals = {
  sum: number;
  cost: number;
  profit: number;
};

export function computeSheetTotals(
  values: string[][],
  rowCount: number,
  sumCol: number,
  costCol: number,
  locale: LocaleSettings,
): SheetTotals {
  let sum = 0;
  let cost = 0;
  for (let r = 0; r < rowCount; r++) {
    const row = values[r];
    if (!row) continue;
    const sumVal = parseNumericCell(String(row[sumCol] ?? ''), locale);
    const costVal = parseNumericCell(String(row[costCol] ?? ''), locale);
    sum += sumVal ?? 0;
    cost += costVal ?? 0;
  }
  const profit = sum - cost;
  return { sum, cost, profit };
}

export function formatUaMoney(value: number): string {
  const s = value.toFixed(2).replace('.', ',');
  const [int, dec] = s.split(',');
  const withSpaces = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces},${dec ?? '00'} ₴`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} %`;
}
