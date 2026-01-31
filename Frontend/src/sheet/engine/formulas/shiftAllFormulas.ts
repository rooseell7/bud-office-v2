/**
 * Shift all formula refs in rawValues. Canonical sheet: src/sheet/**
 */

import type { SheetState } from '../state';
import type { ShiftOp } from './shiftRefs';
import { shiftFormulaRefs } from './shiftRefs';

export type FormulaDiff = { r: number; c: number; prevRaw: string; nextRaw: string };

/**
 * Apply shift to all formula cells. Returns updated rawValues and diffs for undo.
 * Diffs use pre-operation coordinates.
 */
export function shiftAllFormulas(
  rawValues: string[][],
  rowCount: number,
  colCount: number,
  op: ShiftOp,
): { rawValues: string[][]; formulaDiffs: FormulaDiff[] } {
  const formulaDiffs: FormulaDiff[] = [];
  const result = rawValues.map((row, r) =>
    row.map((raw, c) => {
      const trimmed = (raw || '').trim();
      if (!trimmed.startsWith('=')) return raw;
      const nextRaw = shiftFormulaRefs(raw, op);
      if (nextRaw !== raw) {
        formulaDiffs.push({ r, c, prevRaw: raw, nextRaw });
        return nextRaw;
      }
      return raw;
    }),
  );
  return { rawValues: result, formulaDiffs };
}
