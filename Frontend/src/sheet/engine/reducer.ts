/**
 * Pure reducer. Canonical sheet: src/sheet/**
 */

import type { CellCoord, SelectionRange, StylePatch } from './types';
import type { SheetSnapshot } from './types';
import type { SheetState } from './state';
import { clampCell, normalizeSelection } from './selection';
import { executeCommand } from './history';
import { createApplyValuesCommand } from './commands/applyValues';
import { createPasteCommand } from './commands/paste';
import { createApplyStylesCommandFromPatch } from './commands/applyStyles';
import { computeValues } from './formulas/compute';

export const SET_ACTIVE_CELL = 'SET_ACTIVE_CELL' as const;
export const SET_SELECTION = 'SET_SELECTION' as const;
export const SET_SELECTION_ANCHOR = 'SET_SELECTION_ANCHOR' as const;
export const EXTEND_SELECTION = 'EXTEND_SELECTION' as const;
export const SET_VALUE = 'SET_VALUE' as const;
export const START_EDIT = 'START_EDIT' as const;
export const UPDATE_EDITOR_VALUE = 'UPDATE_EDITOR_VALUE' as const;
export const CANCEL_EDIT = 'CANCEL_EDIT' as const;
export const COMMIT_EDIT = 'COMMIT_EDIT' as const;
export const MOVE_ACTIVE = 'MOVE_ACTIVE' as const;
export const UNDO = 'UNDO' as const;
export const REDO = 'REDO' as const;
export const PASTE_TSV = 'PASTE_TSV' as const;
export const APPLY_STYLES = 'APPLY_STYLES' as const;
export const HYDRATE = 'HYDRATE' as const;
export const SET_COLUMN_WIDTH = 'SET_COLUMN_WIDTH' as const;

export type MoveDirection = 'down' | 'up' | 'right' | 'left';

export type SheetAction =
  | { type: typeof SET_ACTIVE_CELL; payload: CellCoord }
  | { type: typeof SET_SELECTION; payload: SelectionRange }
  | { type: typeof SET_SELECTION_ANCHOR; payload: CellCoord | null }
  | { type: typeof EXTEND_SELECTION; payload: CellCoord }
  | { type: typeof SET_VALUE; payload: { row: number; col: number; value: string } }
  | { type: typeof START_EDIT }
  | { type: typeof UPDATE_EDITOR_VALUE; payload: string }
  | { type: typeof CANCEL_EDIT }
  | { type: typeof COMMIT_EDIT; payload?: { direction?: MoveDirection } }
  | { type: typeof MOVE_ACTIVE; payload: { coord: CellCoord; shiftKey?: boolean } }
  | { type: typeof UNDO }
  | { type: typeof REDO }
  | { type: typeof PASTE_TSV; payload: string[][] }
  | { type: typeof APPLY_STYLES; payload: StylePatch }
  | { type: typeof HYDRATE; payload: SheetSnapshot }
  | { type: typeof SET_COLUMN_WIDTH; payload: { col: number; width: number } };

export function sheetReducer(state: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case SET_ACTIVE_CELL: {
      const clamped = clampCell(
        action.payload,
        state.rowCount,
        state.colCount,
      );
      return {
        ...state,
        activeCell: clamped,
        selection: {
          r1: clamped.row,
          c1: clamped.col,
          r2: clamped.row,
          c2: clamped.col,
        },
        selectionAnchor: clamped,
      };
    }
    case SET_SELECTION: {
      const norm = normalizeSelection(action.payload);
      const r1 = Math.max(0, Math.min(norm.r1, state.rowCount - 1));
      const c1 = Math.max(0, Math.min(norm.c1, state.colCount - 1));
      const r2 = Math.max(0, Math.min(norm.r2, state.rowCount - 1));
      const c2 = Math.max(0, Math.min(norm.c2, state.colCount - 1));
      return {
        ...state,
        selection: { r1, c1, r2, c2 },
      };
    }
    case SET_SELECTION_ANCHOR: {
      return { ...state, selectionAnchor: action.payload };
    }
    case EXTEND_SELECTION: {
      const anchor = state.selectionAnchor ?? state.activeCell;
      const clamped = clampCell(action.payload, state.rowCount, state.colCount);
      const norm = normalizeSelection({
        r1: anchor.row,
        c1: anchor.col,
        r2: clamped.row,
        c2: clamped.col,
      });
      const r1 = Math.max(0, Math.min(norm.r1, state.rowCount - 1));
      const c1 = Math.max(0, Math.min(norm.c1, state.colCount - 1));
      const r2 = Math.max(0, Math.min(norm.r2, state.rowCount - 1));
      const c2 = Math.max(0, Math.min(norm.c2, state.colCount - 1));
      return {
        ...state,
        activeCell: clamped,
        selection: { r1, c1, r2, c2 },
        selectionAnchor: anchor,
      };
    }
    case START_EDIT: {
      const { activeCell, rawValues } = state;
      const val = rawValues[activeCell.row]?.[activeCell.col] ?? '';
      return {
        ...state,
        isEditing: true,
        editCell: activeCell,
        editorValue: val,
      };
    }
    case UPDATE_EDITOR_VALUE: {
      return {
        ...state,
        editorValue: action.payload,
      };
    }
    case CANCEL_EDIT: {
      return {
        ...state,
        isEditing: false,
        editCell: null,
        editorValue: '',
      };
    }
    case COMMIT_EDIT: {
      if (!state.editCell) return state;
      const { row, col } = state.editCell;
      const value = state.editorValue;
      const r = Math.max(0, Math.min(row, state.rowCount - 1));
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const prev = state.rawValues[r]?.[c] ?? '';
      const command = createApplyValuesCommand([{ row: r, col: c, prev, next: value }]);
      const base = {
        ...state,
        isEditing: false,
        editCell: null,
        editorValue: '',
      };
      let next: SheetState = executeCommand(base, command);
      const dir = action.payload?.direction;
      if (dir) {
        const { activeCell } = next;
        let nr = activeCell.row;
        let nc = activeCell.col;
        if (dir === 'down') nr = Math.min(nr + 1, state.rowCount - 1);
        else if (dir === 'up') nr = Math.max(nr - 1, 0);
        else if (dir === 'right') nc = Math.min(nc + 1, state.colCount - 1);
        else if (dir === 'left') nc = Math.max(nc - 1, 0);
        const newCell = { row: nr, col: nc };
        next = {
          ...next,
          activeCell: newCell,
          selection: { r1: nr, c1: nc, r2: nr, c2: nc },
          selectionAnchor: newCell,
        };
      }
      return next;
    }
    case MOVE_ACTIVE: {
      const { coord, shiftKey } = action.payload;
      const clamped = clampCell(coord, state.rowCount, state.colCount);
      if (shiftKey && state.selectionAnchor) {
        const a = state.selectionAnchor;
        const norm = normalizeSelection({
          r1: a.row,
          c1: a.col,
          r2: clamped.row,
          c2: clamped.col,
        });
        const r1 = Math.max(0, Math.min(norm.r1, state.rowCount - 1));
        const c1 = Math.max(0, Math.min(norm.c1, state.colCount - 1));
        const r2 = Math.max(0, Math.min(norm.r2, state.rowCount - 1));
        const c2 = Math.max(0, Math.min(norm.c2, state.colCount - 1));
        return {
          ...state,
          activeCell: clamped,
          selection: { r1, c1, r2, c2 },
        };
      }
      return {
        ...state,
        activeCell: clamped,
        selection: {
          r1: clamped.row,
          c1: clamped.col,
          r2: clamped.row,
          c2: clamped.col,
        },
        selectionAnchor: clamped,
      };
    }
    case SET_VALUE: {
      const { row, col, value } = action.payload;
      const r = Math.max(0, Math.min(row, state.rowCount - 1));
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const rawValues = state.rawValues.map((arr, i) =>
        i === r ? [...arr.slice(0, c), value, ...arr.slice(c + 1)] : [...arr],
      );
      const values = computeValues(rawValues, state.rowCount, state.colCount, state.locale);
      return { ...state, rawValues, values };
    }
    case UNDO: {
      const { undoStack, redoStack } = state;
      if (undoStack.length === 0) return state;
      const command = undoStack[undoStack.length - 1];
      const prev = command.undo(state);
      return {
        ...prev,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, command],
      };
    }
    case REDO: {
      const { undoStack, redoStack } = state;
      if (redoStack.length === 0) return state;
      const command = redoStack[redoStack.length - 1];
      const next = command.do(state);
      return {
        ...next,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...undoStack, command],
      };
    }
    case PASTE_TSV: {
      const matrix = action.payload;
      if (!matrix.length) return state;
      const { activeCell } = state;
      const command = createPasteCommand(
        state,
        activeCell.row,
        activeCell.col,
        matrix,
      );
      return executeCommand(state, command);
    }
    case APPLY_STYLES: {
      const command = createApplyStylesCommandFromPatch(state, action.payload);
      return executeCommand(state, command);
    }
    case SET_COLUMN_WIDTH: {
      const { col, width } = action.payload;
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const w = Math.max(40, Math.min(width, 400));
      const columnWidths = { ...state.columnWidths, [c]: w };
      return { ...state, columnWidths };
    }
    case HYDRATE: {
      const snap = action.payload;
      const rowCount = snap.rowCount ?? state.rowCount;
      const colCount = snap.colCount ?? state.colCount;
      const srcRaw = snap.rawValues ?? snap.values ?? [];
      const rawValues: string[][] = [];
      for (let r = 0; r < rowCount; r++) {
        const row = srcRaw[r];
        rawValues[r] = row ? [...row] : [];
        while (rawValues[r].length < colCount) rawValues[r].push('');
        rawValues[r] = rawValues[r].slice(0, colCount);
      }
      const values = computeValues(rawValues, rowCount, colCount, state.locale);
      const cellStyles = snap.styles ? { ...snap.styles } : {};
      const columnWidths = snap.columnWidths ? { ...snap.columnWidths } : {};
      return {
        ...state,
        rowCount,
        colCount,
        rawValues,
        values,
        cellStyles,
        columnWidths,
      };
    }
    default:
      return state;
  }
}
