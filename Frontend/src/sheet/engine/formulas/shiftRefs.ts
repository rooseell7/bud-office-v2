/**
 * Shift formula refs on insert/delete column/row. Canonical sheet: src/sheet/**
 */

import { colToLabel } from '../../utils/colLabel';

/** A1 -> 0, B -> 1, Z -> 25, AA -> 26 */
function colLabelToIndex(label: string): number {
  let col = 0;
  const s = (label || '').toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) - 64;
    if (c < 1 || c > 26) return -1;
    col = col * 26 + c;
  }
  return col - 1;
}

export type ShiftOp =
  | { type: 'insert_col'; index: number }
  | { type: 'delete_col'; index: number }
  | { type: 'insert_row'; index: number }
  | { type: 'delete_row'; index: number };

/** Matches ref or range: A1 or A1:B2. Single pass to avoid double-processing. */
const REF_OR_RANGE = /([A-Z]{1,3})(\d+)(?::([A-Z]{1,3})(\d+))?/gi;

/**
 * Shift formula references. Formulas with $ are left unchanged (MVP).
 */
export function shiftFormulaRefs(formula: string, op: ShiftOp): string {
  const raw = (formula || '').trim();
  if (!raw.startsWith('=')) return formula;
  if (raw.includes('$')) return formula;

  const result = raw.replace(REF_OR_RANGE, (match, c1, r1, c2, r2) => {
    const isRange = c2 != null && r2 != null;
    if (isRange) {
      const col1 = colLabelToIndex(c1);
      const row1 = parseInt(r1, 10) - 1;
      const col2 = colLabelToIndex(c2);
      const row2 = parseInt(r2, 10) - 1;
      if (col1 < 0 || col2 < 0) return match;

      if (op.type === 'insert_col') {
        const k = op.index;
        if (col1 >= k) {
          return `${colToLabel(col1 + 1)}${row1 + 1}:${colToLabel(col2 + 1)}${row2 + 1}`;
        }
        if (col2 >= k) {
          return `${colToLabel(col1)}${row1 + 1}:${colToLabel(col2 + 1)}${row2 + 1}`;
        }
        return match;
      }
      if (op.type === 'delete_col') {
        const k = op.index;
        if ((col1 <= k && k <= col2) || (col2 <= k && k <= col1)) return '#REF!';
        if (col1 > k && col2 > k) {
          return `${colToLabel(col1 - 1)}${row1 + 1}:${colToLabel(col2 - 1)}${row2 + 1}`;
        }
        if (col1 < k && col2 < k) return match;
        if (col1 > k) return `${colToLabel(col1 - 1)}${row1 + 1}:${colToLabel(col2 - 1)}${row2 + 1}`;
        return `${colToLabel(col1)}${row1 + 1}:${colToLabel(col2 - 1)}${row2 + 1}`;
      }
      if (op.type === 'insert_row') {
        const r = op.index;
        if (row1 >= r && row2 >= r) {
          return `${colToLabel(col1)}${row1 + 2}:${colToLabel(col2)}${row2 + 2}`;
        }
        if (row1 >= r || row2 >= r) {
          const nr1 = row1 >= r ? row1 + 1 : row1;
          const nr2 = row2 >= r ? row2 + 1 : row2;
          return `${colToLabel(col1)}${nr1 + 1}:${colToLabel(col2)}${nr2 + 1}`;
        }
        return match;
      }
      if (op.type === 'delete_row') {
        const r = op.index;
        if ((row1 <= r && r <= row2) || (row2 <= r && r <= row1)) return '#REF!';
        if (row1 > r && row2 > r) {
          return `${colToLabel(col1)}${row1}:${colToLabel(col2)}${row2}`;
        }
        if (row1 < r && row2 < r) return match;
        if (row1 > r) return `${colToLabel(col1)}${row1}:${colToLabel(col2)}${row2}`;
        return `${colToLabel(col1)}${row1 + 1}:${colToLabel(col2)}${row2}`;
      }
      return match;
    }

    // Cell ref (not range)
    const col = colLabelToIndex(c1);
    const row = parseInt(r1, 10) - 1;
    if (col < 0) return match;

    if (op.type === 'insert_col') {
      const k = op.index;
      if (col >= k) return `${colToLabel(col + 1)}${row + 1}`;
      return match;
    }
    if (op.type === 'delete_col') {
      const k = op.index;
      if (col === k) return '#REF!';
      if (col > k) return `${colToLabel(col - 1)}${row + 1}`;
      return match;
    }
    if (op.type === 'insert_row') {
      const r = op.index;
      if (row >= r) return `${colToLabel(col)}${row + 2}`;
      return match;
    }
    if (op.type === 'delete_row') {
      const r = op.index;
      if (row === r) return '#REF!';
      if (row > r) return `${colToLabel(col)}${row}`;
      return match;
    }
    return match;
  });

  return result;
}

/** Shift formula refs when pasting: add deltaRow/deltaCol to all refs. */
export function shiftFormulaRefsForPaste(
  formula: string,
  deltaRow: number,
  deltaCol: number,
): string {
  if (!deltaRow && !deltaCol) return formula;
  const raw = (formula || '').trim();
  if (!raw.startsWith('=')) return formula;
  if (raw.includes('$')) return formula;

  const result = raw.replace(REF_OR_RANGE, (match, c1, r1, c2, r2) => {
    const col1 = colLabelToIndex(c1);
    const row1 = parseInt(r1, 10) - 1;
    if (col1 < 0) return match;
    const nc1 = col1 + deltaCol;
    const nr1 = row1 + deltaRow;
    if (nc1 < 0 || nr1 < 0) return '#REF!';
    if (c2 != null && r2 != null) {
      const col2 = colLabelToIndex(c2);
      const row2 = parseInt(r2, 10) - 1;
      if (col2 < 0) return match;
      const nc2 = col2 + deltaCol;
      const nr2 = row2 + deltaRow;
      if (nc2 < 0 || nr2 < 0) return '#REF!';
      return `${colToLabel(nc1)}${nr1 + 1}:${colToLabel(nc2)}${nr2 + 1}`;
    }
    return `${colToLabel(nc1)}${nr1 + 1}`;
  });
  return result;
}
