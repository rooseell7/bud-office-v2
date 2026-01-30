/**
 * Serialization. Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from './types';
import type { SheetState } from './state';

/** Serialize state to snapshot (excludes transient: isEditing, undoStack, etc.) */
export function serialize(state: SheetState): SheetSnapshot {
  return {
    values: state.values.map((row) => [...row]),
    rawValues: state.rawValues.map((row) => [...row]),
    styles: state.cellStyles && Object.keys(state.cellStyles).length > 0
      ? { ...state.cellStyles }
      : undefined,
    rowCount: state.rowCount,
    colCount: state.colCount,
    columnWidths:
      state.columnWidths && Object.keys(state.columnWidths).length > 0
        ? { ...state.columnWidths }
        : undefined,
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
  return {
    ...baseState,
    rowCount,
    colCount,
    values,
    cellStyles,
  };
}

export function snapshotToValues(snapshot: SheetSnapshot): string[][] {
  return (snapshot.values ?? []).map((row) => [...row]);
}
