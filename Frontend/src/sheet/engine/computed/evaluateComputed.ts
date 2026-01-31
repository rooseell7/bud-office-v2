/**
 * Evaluate column computed formulas per row. Canonical sheet: src/sheet/**
 */

import type { SheetColumn } from '../types';
import type { LocaleSettings } from '../../configs/types';
import { parseNumericCell } from '../number/parseCellValue';
import { evaluateExpr } from './exprParser';

export type GetCellValue = (row: number, col: number) => string | number;

/**
 * Build key -> colIndex map from columns.
 */
export function buildKeyToColMap(columns: SheetColumn[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let c = 0; c < columns.length; c++) {
    const col = columns[c];
    if (col?.key) m.set(col.key, c);
  }
  return m;
}

/**
 * Evaluate computed cell for a column with computed.expr.
 * Returns number, null (empty), or '#ERR' (syntax/div0 only).
 * Policy: missing/invalid deps → 0 (not error).
 */
export function evaluateComputedCell(
  rowIndex: number,
  colIndex: number,
  columns: SheetColumn[],
  getCellValue: GetCellValue,
  locale: LocaleSettings,
  getCellRaw: (row: number, col: number) => string,
  rowCount: number,
  version: number,
): number | null | '#ERR' {
  const col = columns[colIndex];
  if (!col?.computed?.expr) return null as never;

  const keyToCol = buildKeyToColMap(columns);
  const getRef = (key: string): number => {
    if (key === '_row') return rowIndex + 1;
    const c = keyToCol.get(key);
    if (c == null) return 0;
    const v = getCellValue(rowIndex, c);
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseNumericCell(String(v), locale);
    return n != null && Number.isFinite(n) ? n : 0;
  };

  const getCellNumeric = (r: number, colKey: string): number => {
    const c = keyToCol.get(colKey);
    if (c == null) return 0;
    const v = getCellValue(r, c);
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseNumericCell(String(v), locale);
    return n != null && Number.isFinite(n) ? n : 0;
  };

  const isCellNonEmpty = (r: number, colKey: string): boolean => {
    const c = keyToCol.get(colKey);
    if (c == null) return false;
    const raw = getCellRaw(r, c);
    return (raw ?? '').trim() !== '';
  };

  const ctx = {
    rowIndex,
    colIndex,
    rowCount,
    version,
    keyToCol,
    getCellNumeric,
    isCellNonEmpty,
  };

  const result = evaluateExpr(col.computed.expr, getRef, ctx);
  if (result === null) return '#ERR';
  return result;
}
