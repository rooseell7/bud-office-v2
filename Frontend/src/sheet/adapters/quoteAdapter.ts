/**
 * Quote (КП) adapter. Load/save with initial snapshot and quoteTotals.
 * Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from '../engine/types';
import { Q_COL } from '../configs/quoteSheetConfig';
import { quoteSheetConfig } from '../configs/quoteSheetConfig';
import { uaLocale } from '../configs/types';
import { parseLocaleNumber } from '../engine/number/parseNumber';
import { computeValues } from '../engine/formulas/compute';
import { buildColumnsFromConfig } from '../engine/columnUtils';

export type QuoteTotals = {
  total: number;
  rowCount: number;
};

export function getInitialQuoteSnapshot(): SheetSnapshot {
  const rowCount = 3;
  const colCount = quoteSheetConfig.colCount ?? 8;
  const columns = buildColumnsFromConfig(quoteSheetConfig);
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    rawValues[r] = Array(colCount).fill('');
  }
  const values = computeValues(
    rawValues,
    rowCount,
    colCount,
    uaLocale,
    undefined,
    columns,
  );
  return {
    rowCount,
    colCount,
    rawValues,
    values,
    columns,
  };
}

/** Sum of "Загальна" column (TOTAL) from computed values */
export function computeQuoteTotals(snapshot: SheetSnapshot): QuoteTotals {
  const colTotal = Q_COL.TOTAL;
  const rawValues = snapshot.rawValues ?? snapshot.values ?? [];
  const columns = snapshot.columns ?? buildColumnsFromConfig(quoteSheetConfig);
  const locale = uaLocale;
  const values = computeValues(
    rawValues,
    snapshot.rowCount ?? rawValues.length,
    snapshot.colCount ?? (rawValues[0]?.length ?? 0),
    locale,
    undefined,
    columns,
  );
  let total = 0;
  let rowCount = 0;
  for (let r = 0; r < values.length; r++) {
    const cell = values[r]?.[colTotal] ?? '';
    const n = parseLocaleNumber(String(cell).trim(), locale);
    if (n != null && n !== 0) {
      total += n;
      rowCount++;
    }
  }
  return { total: Math.round(total * 100) / 100, rowCount };
}

