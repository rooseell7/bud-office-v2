/**
 * Apply values command. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { cellKey } from '../state';
import { computeValues } from '../formulas/compute';
import type { CellError } from '../types';
import { validateCellByColumnType } from '../locale/validateCell';

export type CellChange = {
  row: number;
  col: number;
  prev: string;
  next: string;
  /** Error for next value (null = clear). Only used when useNext=true. */
  nextError?: CellError | null;
};

function applyRawAndCompute(state: SheetState, changes: CellChange[], useNext: boolean): SheetState {
  let rawValues = state.rawValues;
  const cellErrors = { ...(state.cellErrors ?? {}) };
  for (const { row, col, prev, next, nextError } of changes) {
    const r = Math.max(0, Math.min(row, state.rowCount - 1));
    const c = Math.max(0, Math.min(col, state.colCount - 1));
    const val = useNext ? next : prev;
    rawValues = rawValues.map((arr, i) =>
      i === r ? [...arr.slice(0, c), val, ...arr.slice(c + 1)] : [...arr],
    );
    const key = cellKey(r, c);
    if (useNext && nextError !== undefined) {
      if (nextError) cellErrors[key] = nextError;
      else delete cellErrors[key];
    } else if (!useNext) {
      const colDef = state.columns?.[c];
      const { error } = validateCellByColumnType(val, colDef?.type, state.locale);
      if (error) cellErrors[key] = error;
      else delete cellErrors[key];
    }
  }
  const values = computeValues(rawValues, state.rowCount, state.colCount, state.locale, state.computedColumns, state.columns, state.version);
  return { ...state, rawValues, values, cellErrors: Object.keys(cellErrors).length ? cellErrors : undefined };
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
