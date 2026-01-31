/**
 * Shift formula refs by row/col delta. Canonical sheet: src/sheet/**
 */

import { shiftFormulaRefsForPaste } from './shiftRefs';

/**
 * Shift formula references by deltaRow and deltaCol.
 * A1 with deltaRow=1, deltaCol=0 → A2
 */
export function shiftFormulaByDelta(
  formula: string,
  deltaRow: number,
  deltaCol: number,
): string {
  return shiftFormulaRefsForPaste(formula, deltaRow, deltaCol);
}
