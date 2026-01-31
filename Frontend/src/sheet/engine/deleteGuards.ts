/**
 * Helpers for delete confirm / guards. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';

export function columnHasData(state: SheetState, col: number): boolean {
  for (let r = 0; r < state.rowCount; r++) {
    const raw = state.rawValues[r]?.[col] ?? '';
    const val = state.values[r]?.[col] ?? '';
    const key = `${r}:${col}`;
    const style = state.cellStyles?.[key];
    if ((raw || val) || (style && Object.keys(style).length > 0)) return true;
  }
  return false;
}

export function rowHasData(state: SheetState, row: number): boolean {
  for (let c = 0; c < state.colCount; c++) {
    const raw = state.rawValues[row]?.[c] ?? '';
    const val = state.values[row]?.[c] ?? '';
    const key = `${row}:${c}`;
    const style = state.cellStyles?.[key];
    if ((raw || val) || (style && Object.keys(style).length > 0)) return true;
  }
  return false;
}

export function tableHasFormulas(state: SheetState): boolean {
  for (let r = 0; r < state.rowCount; r++) {
    for (let c = 0; c < state.colCount; c++) {
      const raw = (state.rawValues[r]?.[c] ?? '').trim();
      if (raw.startsWith('=') && !raw.includes('$')) return true;
    }
  }
  return false;
}

export function columnsHaveData(state: SheetState, cols: number[]): boolean {
  return cols.some((c) => columnHasData(state, c));
}

export function rowsHaveData(state: SheetState, rows: number[]): boolean {
  return rows.some((r) => rowHasData(state, r));
}

