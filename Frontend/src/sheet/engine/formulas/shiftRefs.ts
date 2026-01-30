/**
 * Shift formula refs for paste (relative). Canonical sheet: src/sheet/**
 */

import { colToLetter, letterToCol } from '../../utils';

/** Shift A1-style ref by row/col delta. */
function shiftRef(colStr: string, rowStr: string, dr: number, dc: number): string {
  const c = letterToCol(colStr);
  const r = parseInt(rowStr, 10) - 1;
  const newR = Math.max(0, r + dr) + 1;
  const newC = Math.max(0, c + dc);
  return colToLetter(newC) + newR;
}

/**
 * Shift formula references by (dr, dc).
 * =A1+B1 pasted 1 row down -> =A2+B2
 */
export function shiftFormulaRefs(formula: string, dr: number, dc: number): string {
  if (!formula || !formula.trim().startsWith('=')) return formula;
  return formula.replace(/([A-Z]+)([1-9]\d*)/gi, (_, colStr, rowStr) =>
    shiftRef(colStr, rowStr, dr, dc),
  );
}
