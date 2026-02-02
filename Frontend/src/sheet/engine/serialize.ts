/**
 * Serialization. Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from './types';
import type { SheetState } from './state';

import { clampColWidth, clampRowHeight } from './resizeConstants';

/** Serialize state to snapshot (excludes transient: isEditing, undoStack, etc.) */
export function serialize(state: SheetState): SheetSnapshot {
  const columnWidths: Record<number, number> = {};
  if (state.columnWidths && Object.keys(state.columnWidths).length > 0) {
    for (const [k, v] of Object.entries(state.columnWidths)) {
      const col = parseInt(k, 10);
      if (!isNaN(col)) columnWidths[col] = clampColWidth(v);
    }
  }
  const rowHeights: Record<number, number> = {};
  if (state.rowHeights && Object.keys(state.rowHeights).length > 0) {
    for (const [k, v] of Object.entries(state.rowHeights)) {
      const row = parseInt(k, 10);
      if (!isNaN(row)) rowHeights[row] = clampRowHeight(v);
    }
  }
  return {
    values: state.values.map((row) => [...row]),
    rawValues: state.rawValues.map((row) => [...row]),
    styles: state.cellStyles && Object.keys(state.cellStyles).length > 0
      ? { ...state.cellStyles }
      : undefined,
    rowCount: state.rowCount,
    colCount: state.colCount,
    columns: state.columns?.length ? [...state.columns] : undefined,
    columnWidths: Object.keys(columnWidths).length > 0 ? columnWidths : undefined,
    rowHeights: Object.keys(rowHeights).length > 0 ? rowHeights : undefined,
    cellErrors: state.cellErrors && Object.keys(state.cellErrors).length > 0 ? { ...state.cellErrors } : undefined,
    rowIds: state.rowIds?.length ? [...state.rowIds] : undefined,
    filtersEnabled: state.filtersEnabled ?? undefined,
    filters: state.filters && Object.keys(state.filters).length > 0 ? { ...state.filters } : undefined,
    freeze: state.freeze && (state.freeze.rows > 0 || state.freeze.cols > 0) ? { ...state.freeze } : undefined,
    cellComments: state.cellComments && Object.keys(state.cellComments).length > 0 ? { ...state.cellComments } : undefined,
  };
}

export function stateToSnapshot(state: SheetState): SheetSnapshot {
  return serialize(state);
}

/** Hydrate snapshot into baseState (preserves rowCount/colCount from base) */
export function hydrate(
  snapshot: SheetSnapshot,
  baseState: SheetState,
): SheetState {
  const rowCount = snapshot.rowCount ?? baseState.rowCount;
  const colCount = snapshot.colCount ?? baseState.colCount;
  const src = snapshot.values ?? [];
  const values: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row = src[r];
    values[r] = row ? [...row] : [];
    while (values[r].length < colCount) values[r].push('');
    values[r] = values[r].slice(0, colCount);
  }
  const cellStyles = snapshot.styles ? { ...snapshot.styles } : {};
  const columnWidths: Record<number, number> = {};
  if (snapshot.columnWidths) {
    for (const [k, v] of Object.entries(snapshot.columnWidths)) {
      const col = parseInt(k, 10);
      if (!isNaN(col)) columnWidths[col] = clampColWidth(v);
    }
  }
  const rowHeights: Record<number, number> = {};
  if (snapshot.rowHeights) {
    for (const [k, v] of Object.entries(snapshot.rowHeights)) {
      const row = parseInt(k, 10);
      if (!isNaN(row)) rowHeights[row] = clampRowHeight(v);
    }
  }
  return {
    ...baseState,
    rowCount,
    colCount,
    values,
    cellStyles,
    columns: snapshot.columns?.length ? [...snapshot.columns] : baseState.columns,
    columnWidths: snapshot.columnWidths != null ? columnWidths : baseState.columnWidths,
    rowHeights: snapshot.rowHeights != null ? rowHeights : baseState.rowHeights,
    cellErrors: snapshot.cellErrors ? { ...snapshot.cellErrors } : baseState.cellErrors,
    freeze: snapshot.freeze ?? baseState.freeze,
    cellComments: snapshot.cellComments ? { ...snapshot.cellComments } : baseState.cellComments,
  };
}

export function snapshotToValues(snapshot: SheetSnapshot): string[][] {
  return (snapshot.values ?? []).map((row) => [...row]);
}
