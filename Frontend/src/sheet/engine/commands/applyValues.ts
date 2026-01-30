/**
 * Apply values command. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { computeValues } from '../formulas/compute';

export type CellChange = {
  row: number;
  col: number;
  prev: string;
  next: string;
};

function applyRawAndCompute(state: SheetState, changes: CellChange[], useNext: boolean): SheetState {
  let rawValues = state.rawValues;
  for (const { row, col, prev, next } of changes) {
    const r = Math.max(0, Math.min(row, state.rowCount - 1));
    const c = Math.max(0, Math.min(col, state.colCount - 1));
    const val = useNext ? next : prev;
    rawValues = rawValues.map((arr, i) =>
      i === r ? [...arr.slice(0, c), val, ...arr.slice(c + 1)] : [...arr],
    );
  }
  const values = computeValues(rawValues, state.rowCount, state.colCount, state.locale);
  return { ...state, rawValues, values };
}

export function createApplyValuesCommand(changes: CellChange[]): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      return applyRawAndCompute(state, changes, true);
    },
    undo(state: SheetState): SheetState {
      return applyRawAndCompute(state, changes, false);
    },
  };
}
