// FILE: src/modules/shared/sheet/engine/clipboard.ts

import { parseClipboardMatrix } from '../utils';
import type { SheetRange } from './types';
import { normalizeRange } from './range';

export function matrixToTsv(matrix: string[][]): string {
  return (matrix ?? []).map((row) => (row ?? []).join('\t')).join('\n');
}

export function rangeToMatrix<T, C>(
  rows: T[],
  cols: C[],
  range: SheetRange,
  getCellValue: (row: T, col: C) => string,
): string[][] {
  const r = normalizeRange(range);
  const out: string[][] = [];
  for (let ri = r.r1; ri <= r.r2; ri++) {
    const row = rows[ri];
    if (row === undefined) continue;
    const cells: string[] = [];
    for (let ci = r.c1; ci <= r.c2; ci++) {
      const col = cols[ci];
      if (col === undefined) continue;
      cells.push(getCellValue(row, col));
    }
    out.push(cells);
  }
  return out;
}

export async function copyRangeToClipboard<T, C>(
  rows: T[],
  cols: C[],
  range: SheetRange,
  getCellValue: (row: T, col: C) => string,
): Promise<void> {
  const matrix = rangeToMatrix(rows, cols, range, getCellValue);
  const tsv = matrixToTsv(matrix);
  if (!tsv) return;
  await navigator.clipboard.writeText(tsv);
}

export type PasteEnsureRowAt<T> = (rows: T[], targetIndex: number) => { rows: T[]; index: number };

export type ApplyPasteOptions<T, C> = {
  startR: number;
  startC: number;
  tsv: string;
  cols: C[];
  canEditCell?: (row: T, col: C) => boolean;
  normalizeValue?: (col: C, raw: string) => string;
  setCell: (row: T, col: C, value: string) => T;
  /** Optional: extends/inserts rows to reach target index */
  ensureRowAt?: PasteEnsureRowAt<T>;
  /** Optional: recompute row after edits */
  afterRow?: (row: T) => T;
};

/**
 * Applies TSV data into a grid of rows/columns.
 * The function is pure and returns a new rows array.
 */
export function applyTsvPasteToRows<T, C>(prevRows: T[], opts: ApplyPasteOptions<T, C>): T[] {
  const { startR, startC, tsv, cols, canEditCell, normalizeValue, setCell, ensureRowAt, afterRow } = opts;

  const matrix = parseClipboardMatrix(tsv);
  if (!matrix.length) return prevRows;

  let rows = [...prevRows];

  for (let rr = 0; rr < matrix.length; rr++) {
    const target = startR + rr;

    let idx = target;
    if (ensureRowAt) {
      const res = ensureRowAt(rows, target);
      rows = res.rows;
      idx = res.index;
    } else {
      if (idx < 0 || idx >= rows.length) continue;
    }

    const base = rows[idx];
    if (base === undefined) continue;

    let row = base;
    const vals = matrix[rr] ?? [];

    for (let cc = 0; cc < vals.length; cc++) {
      const ci = startC + cc;
      const col = cols[ci];
      if (col === undefined) continue;

      if (canEditCell && !canEditCell(row, col)) continue;

      const raw = String(vals[cc] ?? '');
      const value = normalizeValue ? normalizeValue(col, raw) : raw;
      row = setCell(row, col, value);
    }

    rows[idx] = afterRow ? afterRow(row) : row;
  }

  return rows;
}
