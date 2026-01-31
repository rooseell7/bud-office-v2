/**
 * Pure reducer. Canonical sheet: src/sheet/**
 */

import type { CellCoord, SelectionRange, StylePatch } from './types';
import type { SheetSnapshot } from './types';
import type { SheetState } from './state';
import { clampCell, normalizeSelection } from './selection';
import { executeCommand } from './history';
import { clampColWidth, clampRowHeight } from './resizeConstants';
import { createApplyValuesCommand } from './commands/applyValues';
import { validateCellByColumnType } from './locale/validateCell';
import { createPasteCommand } from './commands/paste';
import { createApplyStylesCommandFromPatch } from './commands/applyStyles';
import { createInsertRowCommand, createDeleteRowCommand } from './commands/rowOps';
import { createResizeColumnCommand } from './commands/resizeColumn';
import { createResizeRowCommand } from './commands/resizeRow';
import { createResizeColumnWithReflowCommand } from './commands/resizeColumnWithReflow';
import { createInsertColumnCommand } from './commands/insertColumn';
import { createRenameColumnCommand } from './commands/renameColumn';
import { createDeleteColumnCommand } from './commands/deleteColumn';
import { createDeleteColumnsBatchCommand } from './commands/deleteColumnsBatch';
import { createDeleteRowsBatchCommand } from './commands/deleteRowsBatch';
import { createSetColumnFormulaCommand } from './commands/setColumnFormula';
import { createApplyFillCommand } from './commands/applyFill';
import { createSortRowsCommand } from './commands/sortRows';
import {
  createSetFiltersEnabledCommand,
  createSetColumnFilterCommand,
  createClearAllFiltersCommand,
} from './commands/setFilters';
import {
  createSetFreezeRowsCommand,
  createSetFreezeColsCommand,
} from './commands/setFreeze';
import { computeRowVisibility } from './filter/applyFilters';
import { computeValues } from './formulas/compute';

function adjustActiveIfHidden(s: SheetState): SheetState {
  if (!s.filtersEnabled) return s;
  const visible = computeRowVisibility(s);
  const ar = s.activeCell.row;
  if (ar < visible.length && visible[ar]) return s;
  for (let r = ar; r < visible.length; r++) {
    if (visible[r]) return { ...s, activeCell: { ...s.activeCell, row: r } };
  }
  for (let r = ar - 1; r >= 0; r--) {
    if (visible[r]) return { ...s, activeCell: { ...s.activeCell, row: r } };
  }
  return s;
}

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
export const RESIZE_COLUMN = 'RESIZE_COLUMN' as const;
export const RESIZE_COLUMN_WITH_REFLOW = 'RESIZE_COLUMN_WITH_REFLOW' as const;
export const RESIZE_ROW = 'RESIZE_ROW' as const;
export const INSERT_ROW = 'INSERT_ROW' as const;
export const INSERT_COLUMN = 'INSERT_COLUMN' as const;
export const RENAME_COLUMN = 'RENAME_COLUMN' as const;
export const DELETE_ROW = 'DELETE_ROW' as const;
export const DELETE_COLUMN = 'DELETE_COLUMN' as const;
export const DELETE_COLUMNS_BATCH = 'DELETE_COLUMNS_BATCH' as const;
export const DELETE_ROWS_BATCH = 'DELETE_ROWS_BATCH' as const;
export const SET_COLUMN_FORMULA = 'SET_COLUMN_FORMULA' as const;
export const APPLY_FILL = 'APPLY_FILL' as const;
export const SORT_ROWS = 'SORT_ROWS' as const;
export const SET_FILTERS_ENABLED = 'SET_FILTERS_ENABLED' as const;
export const SET_COLUMN_FILTER = 'SET_COLUMN_FILTER' as const;
export const CLEAR_ALL_FILTERS = 'CLEAR_ALL_FILTERS' as const;
export const SET_FREEZE_ROWS = 'SET_FREEZE_ROWS' as const;
export const SET_FREEZE_COLS = 'SET_FREEZE_COLS' as const;

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
  | { type: typeof SET_COLUMN_WIDTH; payload: { col: number; width: number } }
  | { type: typeof RESIZE_COLUMN; payload: { col: number; prevWidth: number; nextWidth: number } }
  | {
      type: typeof RESIZE_COLUMN_WITH_REFLOW;
      payload: {
        col: number;
        prevWidth: number;
        nextWidth: number;
        affectedRows: number[];
        prevHeights: number[];
        nextHeights: number[];
      };
    }
  | { type: typeof RESIZE_ROW; payload: { row: number; prevHeight: number; nextHeight: number } }
  | { type: typeof INSERT_ROW; payload: number }
  | {
      type: typeof INSERT_COLUMN;
      payload: { atIndex: number; column: import('./types').SheetColumn; defaultWidth: number };
    }
  | { type: typeof RENAME_COLUMN; payload: { colIndex: number; prevTitle: string; nextTitle: string } }
  | { type: typeof DELETE_ROW; payload: number }
  | {
      type: typeof DELETE_COLUMN;
      payload: import('./commands/deleteColumn').DeleteColumnPayload;
    }
  | { type: typeof DELETE_COLUMNS_BATCH; payload: number[] }
  | { type: typeof DELETE_ROWS_BATCH; payload: number[] }
  | { type: typeof SET_COLUMN_FORMULA; payload: import('./commands/setColumnFormula').SetColumnFormulaPayload }
  | {
      type: typeof APPLY_FILL;
      payload: {
        sourceRange: { r1: number; r2: number; c1: number; c2: number };
        targetRange: { r1: number; r2: number; c1: number; c2: number };
      };
    }
  | { type: typeof SORT_ROWS; payload: { colIndex: number; direction: 'asc' | 'desc' } }
  | { type: typeof SET_FILTERS_ENABLED; payload: boolean }
  | {
      type: typeof SET_COLUMN_FILTER;
      payload: { colId: string; spec: import('./types').FilterSpec | null };
    }
  | { type: typeof CLEAR_ALL_FILTERS }
  | { type: typeof SET_FREEZE_ROWS; payload: number }
  | { type: typeof SET_FREEZE_COLS; payload: number };

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
      const colDef = state.columns?.[c];
      const { error } = validateCellByColumnType(value, colDef?.type, state.locale);
      const nextError = error ?? null;
      const command = createApplyValuesCommand([{ row: r, col: c, prev, next: value, nextError }]);
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
      const values = computeValues(rawValues, state.rowCount, state.colCount, state.locale, state.computedColumns, state.columns, state.version);
      return { ...state, rawValues, values, version: (state.version ?? 0) + 1 };
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
        version: (state.version ?? 0) + 1,
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
        version: (state.version ?? 0) + 1,
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
    case INSERT_ROW: {
      const insertAtIndex = action.payload;
      const command = createInsertRowCommand(insertAtIndex);
      return executeCommand(state, command);
    }
    case INSERT_COLUMN: {
      const { atIndex, column, defaultWidth } = action.payload;
      const command = createInsertColumnCommand(atIndex, column, defaultWidth);
      return executeCommand(state, command);
    }
    case RENAME_COLUMN: {
      const { colIndex, prevTitle, nextTitle } = action.payload;
      const command = createRenameColumnCommand(colIndex, prevTitle, nextTitle);
      return executeCommand(state, command);
    }
    case DELETE_ROW: {
      const atRow = action.payload;
      const capturedRow = state.rawValues[atRow] ? [...state.rawValues[atRow]] : [];
      const command = createDeleteRowCommand(atRow, capturedRow);
      return executeCommand(state, command);
    }
    case DELETE_COLUMN: {
      const command = createDeleteColumnCommand(action.payload);
      return executeCommand(state, command);
    }
    case DELETE_COLUMNS_BATCH: {
      const buildPayload = (s: SheetState, col: number) => {
        const colDef = (s.columns ?? [])[col];
        if (!colDef) throw new Error(`Column ${col} not found`);
        const deletedRawCol = s.rawValues.map((row) => row[col] ?? '');
        const deletedStylesCol: Record<string, import('./types').CellStyle> = {};
        for (let r = 0; r < s.rowCount; r++) {
          const key = `${r}:${col}`;
          const style = s.cellStyles?.[key];
          if (style) deletedStylesCol[key] = style;
        }
        const defaultW = 140;
        const deletedWidth = s.columnWidths?.[col] ?? defaultW;
        return { colIndex: col, deletedColumn: colDef, deletedWidth, deletedRawCol, deletedStylesCol, prevComputedColumns: s.computedColumns };
      };
      const command = createDeleteColumnsBatchCommand(action.payload, buildPayload);
      return executeCommand(state, command);
    }
    case DELETE_ROWS_BATCH: {
      const getCapturedRow = (s: SheetState, row: number) =>
        s.rawValues[row] ? [...s.rawValues[row]] : undefined;
      const command = createDeleteRowsBatchCommand(action.payload, getCapturedRow);
      return executeCommand(state, command);
    }
    case SET_COLUMN_FORMULA: {
      const command = createSetColumnFormulaCommand(action.payload);
      return executeCommand(state, command);
    }
    case APPLY_FILL: {
      const command = createApplyFillCommand(
        state,
        action.payload.sourceRange,
        action.payload.targetRange,
      );
      return executeCommand(state, command);
    }
    case SORT_ROWS: {
      const command = createSortRowsCommand(
        action.payload.colIndex,
        action.payload.direction,
      );
      return executeCommand(state, command);
    }
    case SET_FILTERS_ENABLED: {
      const next = executeCommand(state, createSetFiltersEnabledCommand(action.payload));
      return adjustActiveIfHidden(next);
    }
    case SET_COLUMN_FILTER: {
      const next = executeCommand(
        state,
        createSetColumnFilterCommand(action.payload.colId, action.payload.spec),
      );
      return adjustActiveIfHidden(next);
    }
    case CLEAR_ALL_FILTERS: {
      const next = executeCommand(state, createClearAllFiltersCommand());
      return adjustActiveIfHidden(next);
    }
    case SET_FREEZE_ROWS: {
      const command = createSetFreezeRowsCommand(action.payload);
      return executeCommand(state, command);
    }
    case SET_FREEZE_COLS: {
      const command = createSetFreezeColsCommand(action.payload);
      return executeCommand(state, command);
    }
    case SET_COLUMN_WIDTH: {
      const { col, width } = action.payload;
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const w = clampColWidth(width);
      const columnWidths = { ...state.columnWidths, [c]: w };
      return { ...state, columnWidths };
    }
    case RESIZE_COLUMN: {
      const { col, prevWidth, nextWidth } = action.payload;
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const w = clampColWidth(nextWidth);
      const command = createResizeColumnCommand(c, prevWidth, w);
      return executeCommand(state, command);
    }
    case RESIZE_COLUMN_WITH_REFLOW: {
      const { col, prevWidth, nextWidth, affectedRows, prevHeights, nextHeights } = action.payload;
      const c = Math.max(0, Math.min(col, state.colCount - 1));
      const w = clampColWidth(nextWidth);
      const command = createResizeColumnWithReflowCommand(
        c,
        prevWidth,
        w,
        affectedRows,
        prevHeights,
        nextHeights,
      );
      return executeCommand(state, command);
    }
    case RESIZE_ROW: {
      const { row, prevHeight, nextHeight } = action.payload;
      const r = Math.max(0, Math.min(row, state.rowCount - 1));
      const h = clampRowHeight(nextHeight);
      const command = createResizeRowCommand(r, prevHeight, h);
      return executeCommand(state, command);
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
      const columns = snap.columns?.length ? [...snap.columns] : state.columns;
      const values = computeValues(rawValues, rowCount, colCount, state.locale, state.computedColumns, columns, state.version);
      const cellStyles = snap.styles ? { ...snap.styles } : {};
      const columnWidths: Record<number, number> = {};
      if (snap.columnWidths) {
        for (const [k, v] of Object.entries(snap.columnWidths)) {
          const col = parseInt(k, 10);
          if (!isNaN(col)) columnWidths[col] = clampColWidth(v);
        }
      }
      const rowHeights: Record<number, number> = {};
      if (snap.rowHeights) {
        for (const [k, v] of Object.entries(snap.rowHeights)) {
          const row = parseInt(k, 10);
          if (!isNaN(row)) rowHeights[row] = clampRowHeight(v);
        }
      }
      const cellErrors = snap.cellErrors ? { ...snap.cellErrors } : undefined;
      const srcRowIds = snap.rowIds ?? [];
      const rowIds: string[] = [];
      for (let r = 0; r < rowCount; r++) {
        rowIds[r] = srcRowIds[r] ?? `row_${Date.now()}_${r}`;
      }
      return {
        ...state,
        rowCount,
        colCount,
        rawValues,
        values,
        cellStyles,
        columns,
        rowIds,
        filtersEnabled: snap.filtersEnabled ?? false,
        filters: snap.filters ? { ...snap.filters } : undefined,
        freeze: snap.freeze ?? { rows: 0, cols: 0 },
        columnWidths,
        rowHeights,
        cellErrors,
        version: (state.version ?? 0) + 1,
      };
    }
    default:
      return state;
  }
}
