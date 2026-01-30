/**
 * Clipboard TSV. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import { normalizeSelection } from './selection';
import { parsePastedText } from './clipboard/parse';

export function getSelectionValues(state: SheetState): string[][] {
  const { rawValues, selection } = state;
  const norm = normalizeSelection(selection);
  const r1 = Math.min(norm.r1, norm.r2);
  const r2 = Math.max(norm.r1, norm.r2);
  const c1 = Math.min(norm.c1, norm.c2);
  const c2 = Math.max(norm.c1, norm.c2);
  const rows: string[][] = [];
  for (let r = r1; r <= r2; r++) {
    const row: string[] = [];
    for (let c = c1; c <= c2; c++) {
      row.push(rawValues[r]?.[c] ?? '');
    }
    rows.push(row);
  }
  return rows;
}

/** Always TSV: \t + \n. Copy raw (formulas, numbers) for predictable paste. */
export function toTSV(matrix: string[][]): string {
  return matrix.map((row) => row.join('\t')).join('\n');
}

/** Parse pasted text: normalize line breaks, detect delimiter, split. */
export function parseTSV(text: string): string[][] {
  return parsePastedText(text);
}
