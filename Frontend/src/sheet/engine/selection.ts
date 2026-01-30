/**
 * Selection helpers. Canonical sheet: src/sheet/**
 */

import type { CellCoord, SelectionRange } from './types';
import type { SheetState } from './state';

/** Normalize range so r1<=r2, c1<=c2 */
export function normalizeSelection(range: SelectionRange): SelectionRange {
  return {
    r1: Math.min(range.r1, range.r2),
    c1: Math.min(range.c1, range.c2),
    r2: Math.max(range.r1, range.r2),
    c2: Math.max(range.c1, range.c2),
  };
}

/** Clamp coord to valid bounds */
export function clampCell(
  coord: CellCoord,
  rowCount: number,
  colCount: number,
): CellCoord {
  return {
    row: Math.max(0, Math.min(coord.row, rowCount - 1)),
    col: Math.max(0, Math.min(coord.col, colCount - 1)),
  };
}

/** Set active cell (clamped), returns new state (immutable) */
export function setActiveCell(
  state: SheetState,
  coord: CellCoord,
): SheetState {
  const clamped = clampCell(coord, state.rowCount, state.colCount);
  return {
    ...state,
    activeCell: clamped,
    selection: {
      r1: clamped.row,
      c1: clamped.col,
      r2: clamped.row,
      c2: clamped.col,
    },
  };
}

/** Set selection (normalized), returns new state (immutable) */
export function setSelection(
  state: SheetState,
  range: SelectionRange,
): SheetState {
  const norm = normalizeSelection(range);
  const r1 = Math.max(0, Math.min(norm.r1, state.rowCount - 1));
  const c1 = Math.max(0, Math.min(norm.c1, state.colCount - 1));
  const r2 = Math.max(0, Math.min(norm.r2, state.rowCount - 1));
  const c2 = Math.max(0, Math.min(norm.c2, state.colCount - 1));
  return {
    ...state,
    selection: { r1, c1, r2, c2 },
  };
}
