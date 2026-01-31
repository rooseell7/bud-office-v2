/**
 * Sheet controller hook. Canonical sheet: src/sheet/**
 */

import { useReducer, useCallback } from 'react';
import {
  createInitialState,
  createInitialStateFromSnapshot,
  sheetReducer,
  SET_ACTIVE_CELL,
  SET_SELECTION,
  SET_SELECTION_ANCHOR,
  EXTEND_SELECTION,
  SET_VALUE,
  APPLY_STYLES,
  HYDRATE,
  SET_COLUMN_WIDTH,
  RESIZE_COLUMN,
  RESIZE_COLUMN_WITH_REFLOW,
  RESIZE_ROW,
  INSERT_ROW,
  INSERT_COLUMN,
  RENAME_COLUMN,
  DELETE_ROW,
  DELETE_COLUMN,
  DELETE_COLUMNS_BATCH,
  DELETE_ROWS_BATCH,
  SET_COLUMN_FORMULA,
  APPLY_FILL,
  SORT_ROWS,
  SET_FILTERS_ENABLED,
  SET_COLUMN_FILTER,
  CLEAR_ALL_FILTERS,
  SET_FREEZE_ROWS,
  SET_FREEZE_COLS,
  START_EDIT,
  UPDATE_EDITOR_VALUE,
  CANCEL_EDIT,
  COMMIT_EDIT,
  type SheetState,
  type SheetAction,
  type CellCoord,
  type SelectionRange,
  type SheetSnapshot,
} from '../engine';
import type { SheetConfig } from '../configs/types';
import { defaultLocale } from '../configs/types';
import type { StylePatch } from '../engine/types';
import { reflowWrapRowsAfterColumnWidthChange } from '../engine/reflowWrapRows';
import { buildColumnsFromConfig, createColumn } from '../engine/columnUtils';

export type UseSheetControllerOptions = {
  config?: Partial<SheetConfig>;
  initialSnapshot?: SheetSnapshot | null;
  adapter?: { getDraftKey?(): string | null };
};

const DEFAULT_CONFIG: SheetConfig = {
  colCount: 26,
  rowCount: 100,
};

export function useSheetController(options: UseSheetControllerOptions = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const { rowCount, colCount } = config;

  const [state, dispatch] = useReducer<React.Reducer<SheetState, SheetAction>>(
    sheetReducer,
    { config, snapshot: options.initialSnapshot ?? null },
    (init: { config: SheetConfig; snapshot: SheetSnapshot | null }) => {
      const locale = init.config.locale ?? defaultLocale;
      const computedColumns = init.config.computedColumns;
      const configColumns = buildColumnsFromConfig(init.config);
      if (init.snapshot) {
        return createInitialStateFromSnapshot(
          init.config.rowCount,
          init.config.colCount,
          init.snapshot,
          locale,
          computedColumns,
          configColumns,
        );
      }
      return createInitialState(
        init.config.rowCount,
        init.config.colCount,
        locale,
        computedColumns,
        configColumns,
      );
    },
  );

  const setActiveCell = useCallback((coord: CellCoord) => {
    dispatch({ type: SET_ACTIVE_CELL, payload: coord });
  }, []);

  const setSelection = useCallback((range: SelectionRange) => {
    dispatch({ type: SET_SELECTION, payload: range });
  }, []);

  const setValue = useCallback((row: number, col: number, value: string) => {
    dispatch({ type: SET_VALUE, payload: { row, col, value } });
  }, []);

  const setSelectionAnchor = useCallback((coord: CellCoord | null) => {
    dispatch({ type: SET_SELECTION_ANCHOR, payload: coord });
  }, []);

  const extendSelection = useCallback((coord: CellCoord) => {
    dispatch({ type: EXTEND_SELECTION, payload: coord });
  }, []);

  const startEdit = useCallback(() => {
    dispatch({ type: START_EDIT });
  }, []);

  const updateEditorValue = useCallback((value: string) => {
    dispatch({ type: UPDATE_EDITOR_VALUE, payload: value });
  }, []);

  const cancelEdit = useCallback(() => {
    dispatch({ type: CANCEL_EDIT });
  }, []);

  const commitEdit = useCallback((direction?: 'down' | 'up' | 'right' | 'left') => {
    dispatch({ type: COMMIT_EDIT, payload: direction ? { direction } : undefined });
  }, []);

  const applyStyles = useCallback((patch: StylePatch) => {
    dispatch({ type: APPLY_STYLES, payload: patch });
  }, []);

  const hydrate = useCallback((snapshot: SheetSnapshot) => {
    dispatch({ type: HYDRATE, payload: snapshot });
  }, []);

  const setColumnWidth = useCallback((col: number, width: number) => {
    dispatch({ type: SET_COLUMN_WIDTH, payload: { col, width } });
  }, []);

  const commitColumnResize = useCallback(
    (col: number, prevWidth: number, nextWidth: number) => {
      const reflow = reflowWrapRowsAfterColumnWidthChange(state, col, nextWidth, config);
      if (reflow.affectedRows.length > 0) {
        dispatch({
          type: RESIZE_COLUMN_WITH_REFLOW,
          payload: {
            col,
            prevWidth,
            nextWidth,
            affectedRows: reflow.affectedRows,
            prevHeights: reflow.prevHeights,
            nextHeights: reflow.nextHeights,
          },
        });
      } else {
        dispatch({ type: RESIZE_COLUMN, payload: { col, prevWidth, nextWidth } });
      }
    },
    [state, config],
  );

  const commitRowResize = useCallback((row: number, prevHeight: number, nextHeight: number) => {
    dispatch({ type: RESIZE_ROW, payload: { row, prevHeight, nextHeight } });
  }, []);

  const insertRowAbove = useCallback((row: number) => {
    dispatch({ type: INSERT_ROW, payload: row });
  }, []);

  const insertRowBelow = useCallback((row: number) => {
    dispatch({ type: INSERT_ROW, payload: row + 1 });
  }, []);

  const insertColumnAt = useCallback((atIndex: number) => {
    const column = createColumn('Нова');
    const defaultWidth = 140;
    dispatch({ type: INSERT_COLUMN, payload: { atIndex, column, defaultWidth } });
  }, []);

  const renameColumn = useCallback((colIndex: number, prevTitle: string, nextTitle: string) => {
    dispatch({ type: RENAME_COLUMN, payload: { colIndex, prevTitle, nextTitle } });
  }, []);

  const deleteRow = useCallback(
    (row: number) => {
      const minRows = config?.minRows ?? 1;
      if (state.rowCount <= minRows) return;
      dispatch({ type: DELETE_ROW, payload: row });
    },
    [state.rowCount, config?.minRows],
  );

  const deleteColumn = useCallback(
    (col: number) => {
      const minCols = config?.minColumns ?? 1;
      const protectedIds = new Set(config?.protectedColumnIds ?? []);
      if (state.colCount <= minCols || protectedIds.has(state.columns?.[col]?.id ?? '')) return;
      const columns = state.columns ?? [];
      const colDef = columns[col];
      if (!colDef) return;
      const deletedRawCol = state.rawValues.map((row) => row[col] ?? '');
      const deletedStylesCol: Record<string, import('../engine/types').CellStyle> = {};
      for (let r = 0; r < state.rowCount; r++) {
        const key = `${r}:${col}`;
        const style = state.cellStyles?.[key];
        if (style) deletedStylesCol[key] = style;
      }
      const defaultW = config?.columnWidthDefaults?.[col] ?? 140;
      const deletedWidth = state.columnWidths?.[col] ?? defaultW;
      dispatch({
        type: DELETE_COLUMN,
        payload: {
          colIndex: col,
          deletedColumn: colDef,
          deletedWidth,
          deletedRawCol,
          deletedStylesCol,
          prevComputedColumns: state.computedColumns,
        },
      });
    },
    [state, config],
  );

  const deleteColumnsBatch = useCallback(
    (cols: number[]) => {
      const minCols = config?.minColumns ?? 1;
      const protectedIds = new Set(config?.protectedColumnIds ?? []);
      const columns = state.columns ?? [];
      const toDelete = cols.filter((c) => columns[c] && !protectedIds.has(columns[c].id));
      if (toDelete.length === 0 || state.colCount - toDelete.length < minCols) return;
      dispatch({ type: DELETE_COLUMNS_BATCH, payload: toDelete });
    },
    [state, config],
  );

  const deleteRowsBatch = useCallback(
    (rows: number[]) => {
      const minRows = config?.minRows ?? 1;
      const toDelete = rows.filter((r) => r >= 0 && r < state.rowCount);
      if (toDelete.length === 0 || state.rowCount - toDelete.length < minRows) return;
      dispatch({ type: DELETE_ROWS_BATCH, payload: toDelete });
    },
    [state, config],
  );

  const setColumnFormula = useCallback(
    (colIndex: number, prevExpr: string | undefined, nextExpr: string | undefined) => {
      const readonlyCols = config?.readonlyColumns ?? [];
      const colEditableWhenNoComputed = !readonlyCols.includes(colIndex);
      dispatch({
        type: SET_COLUMN_FORMULA,
        payload: { colIndex, prevExpr, nextExpr, colEditableWhenNoComputed },
      });
    },
    [config],
  );

  const applyFill = useCallback(
    (
      sourceRange: { r1: number; r2: number; c1: number; c2: number },
      targetRange: { r1: number; r2: number; c1: number; c2: number },
    ) => {
      dispatch({ type: APPLY_FILL, payload: { sourceRange, targetRange } });
    },
    [],
  );

  const sortRows = useCallback((colIndex: number, direction: 'asc' | 'desc') => {
    dispatch({ type: SORT_ROWS, payload: { colIndex, direction } });
  }, []);

  const setFiltersEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: SET_FILTERS_ENABLED, payload: enabled });
  }, []);

  const setColumnFilter = useCallback(
    (colId: string, spec: import('../engine/types').FilterSpec | null) => {
      dispatch({ type: SET_COLUMN_FILTER, payload: { colId, spec } });
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    dispatch({ type: CLEAR_ALL_FILTERS });
  }, []);

  const setFreezeRows = useCallback((count: number) => {
    dispatch({ type: SET_FREEZE_ROWS, payload: count });
  }, []);

  const setFreezeCols = useCallback((count: number) => {
    dispatch({ type: SET_FREEZE_COLS, payload: count });
  }, []);

  return {
    state,
    dispatch,
    setActiveCell,
    setSelection,
    setSelectionAnchor,
    extendSelection,
    setValue,
    startEdit,
    updateEditorValue,
    cancelEdit,
    commitEdit,
    applyStyles,
    hydrate,
    setColumnWidth,
    commitColumnResize,
    commitRowResize,
    insertRowAbove,
    insertRowBelow,
    insertColumnAt,
    renameColumn,
    deleteRow,
    deleteColumn,
    deleteColumnsBatch,
    deleteRowsBatch,
    setColumnFormula,
    applyFill,
    sortRows,
    setFiltersEnabled,
    setColumnFilter,
    clearAllFilters,
    setFreezeRows,
    setFreezeCols,
  };
}
