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
      if (init.snapshot) {
        return createInitialStateFromSnapshot(
          init.config.rowCount,
          init.config.colCount,
          init.snapshot,
          locale,
        );
      }
      return createInitialState(init.config.rowCount, init.config.colCount, locale);
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
  };
}
