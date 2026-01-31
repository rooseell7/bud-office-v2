/**
 * Set column formula command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { computeValues } from '../formulas/compute';

export type SetColumnFormulaPayload = {
  colIndex: number;
  prevExpr: string | undefined;
  nextExpr: string | undefined;
  /** When removing computed, use this for editable (from config.readonlyColumns) */
  colEditableWhenNoComputed?: boolean;
};

export function createSetColumnFormulaCommand(payload: SetColumnFormulaPayload): SheetCommand {
  const { colIndex, prevExpr, nextExpr, colEditableWhenNoComputed = true } = payload;

  return {
    do(state: SheetState): SheetState {
      const columns = state.columns ? [...state.columns] : [];
      const col = columns[colIndex];
      if (!col) return state;

      if (nextExpr == null || nextExpr.trim() === '') {
        const { computed, ...rest } = col;
        columns[colIndex] = { ...rest, editable: colEditableWhenNoComputed };
      } else {
        columns[colIndex] = {
          ...col,
          computed: { expr: nextExpr.trim() },
          editable: false,
        };
      }

      const values = computeValues(
        state.rawValues,
        state.rowCount,
        state.colCount,
        state.locale,
        state.computedColumns,
        columns,
        state.version,
      );
      return { ...state, columns, values };
    },
    undo(state: SheetState): SheetState {
      const columns = state.columns ? [...state.columns] : [];
      const col = columns[colIndex];
      if (!col) return state;

      if (prevExpr == null || prevExpr.trim() === '') {
        const { computed, ...rest } = col;
        columns[colIndex] = { ...rest, editable: colEditableWhenNoComputed };
      } else {
        columns[colIndex] = {
          ...col,
          computed: { expr: prevExpr.trim() },
          editable: false,
        };
      }

      const values = computeValues(
        state.rawValues,
        state.rowCount,
        state.colCount,
        state.locale,
        state.computedColumns,
        columns,
        state.version,
      );
      return { ...state, columns, values };
    },
  };
}
