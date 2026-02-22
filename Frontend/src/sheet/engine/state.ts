/**
 * Sheet state. Canonical sheet: src/sheet/**
 */

import type { CellCoord, SelectionRange, CellStyle, SheetColumn, CellError } from './types';
import type { SheetSnapshot } from './types';
import type { SheetCommand } from './commands/types';
import type { LocaleSettings } from '../configs/types';
import type { ComputedColumnDef } from '../configs/types';
import { defaultLocale } from '../configs/types';
import { computeValues } from './formulas/compute';
import { clampColWidth, clampRowHeight } from './resizeConstants';

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureRowIds(state: SheetState): string[] {
  const ids = state.rowIds ?? [];
  if (ids.length >= state.rowCount) return ids.slice(0, state.rowCount);
  const out = [...ids];
  while (out.length < state.rowCount) {
    out.push(generateRowId());
  }
  return out;
}

export type SheetState = {
  rowCount: number;
  colCount: number;
  /** Computed display values (from rawValues after formula eval) */
  values: string[][];
  /** Raw user input (formulas like =A1+B1, text, numbers) */
  rawValues: string[][];
  activeCell: CellCoord;
  selection: SelectionRange;
  /** STEP 4: edit mode */
  isEditing: boolean;
  editorValue: string;
  editCell: CellCoord | null;
  /** STEP 5: anchor for shift-selection */
  selectionAnchor: CellCoord | null;
  /** STEP 6: prepared for undo/redo (not yet used) */
  undoStack: SheetCommand[];
  redoStack: SheetCommand[];
  /** STEP 9: per-cell styles */
  cellStyles: Record<string, CellStyle>;
  /** STEP 18: column widths (col index -> px) */
  columnWidths: Record<number, number>;
  /** Row heights (row index -> px) */
  rowHeights: Record<number, number>;
  /** Column definitions (when present, used for headers; colCount = columns.length) */
  columns?: SheetColumn[];
  /** UA locale for parse/format */
  locale: LocaleSettings;
  /** Computed columns (engine-level derived, indices may shift on column insert) */
  computedColumns?: ComputedColumnDef[];
  /** Per-cell validation errors (cellKey -> error) */
  cellErrors?: Record<string, CellError>;
  /** Incremented on data changes; used for aggregate cache invalidation */
  version?: number;
  /** Stable row ids (len = rowCount) */
  rowIds?: string[];
  /** Filter mode enabled */
  filtersEnabled?: boolean;
  /** Filters by column id */
  filters?: Record<string, import('./types').FilterSpec>;
  /** Freeze panes: rows from top, cols from left (0 = no freeze) */
  freeze?: { rows: number; cols: number };
  /** Cell comments (cellKey -> text) */
  cellComments?: Record<string, string>;
};

/** Create initial empty state */
export function createInitialState(
  rowCount: number,
  colCount: number,
  locale: LocaleSettings = defaultLocale,
  computedColumns?: ComputedColumnDef[],
  columns?: SheetColumn[],
): SheetState {
  const cols = columns ?? [];
  const cc = cols.length > 0 ? cols.length : colCount;
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    rawValues[r] = Array(cc).fill('');
  }
  const values = computeValues(rawValues, rowCount, cc, locale, computedColumns, cols.length ? cols : undefined);
  const rowIds = Array.from({ length: rowCount }, () => generateRowId());
  return {
    rowCount,
    colCount: cc,
    values,
    rawValues,
    rowIds,
    activeCell: { row: 0, col: 0 },
    selection: { r1: 0, c1: 0, r2: 0, c2: 0 },
    isEditing: false,
    editorValue: '',
    editCell: null,
    selectionAnchor: { row: 0, col: 0 },
    undoStack: [],
    redoStack: [],
    cellStyles: {},
    columnWidths: {},
    rowHeights: {},
    columns: cols.length > 0 ? cols : undefined,
    locale,
    computedColumns,
    version: 0,
    filtersEnabled: false,
    freeze: { rows: 0, cols: 0 },
  };
}

/** Create state from snapshot; pad/trim to fit rowCount×colCount */
export function createInitialStateFromSnapshot(
  rowCount: number,
  colCount: number,
  snapshot: SheetSnapshot,
  locale: LocaleSettings = defaultLocale,
  computedColumns?: ComputedColumnDef[],
  configColumns?: SheetColumn[],
): SheetState {
  const cols = snapshot.columns ?? configColumns ?? [];
  const cc = cols.length > 0 ? cols.length : (snapshot.colCount ?? colCount);
  const values: string[][] = [];
  const rawValues: string[][] = [];
  const srcRaw = snapshot.rawValues ?? snapshot.values ?? [];
  const src = snapshot.values ?? [];
  for (let r = 0; r < rowCount; r++) {
    const rowRaw = srcRaw[r];
    rawValues[r] = rowRaw ? [...rowRaw] : [];
    while (rawValues[r].length < cc) rawValues[r].push('');
    rawValues[r] = rawValues[r].slice(0, cc);

    const row = src[r];
    values[r] = row ? [...row] : [];
    while (values[r].length < cc) values[r].push('');
    values[r] = values[r].slice(0, cc);
  }
  const computed = computeValues(rawValues, rowCount, cc, locale, computedColumns, cols.length ? cols : undefined);
  const srcRowIds = snapshot.rowIds ?? [];
  const rowIds: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    rowIds[r] = srcRowIds[r] ?? generateRowId();
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
    rowCount,
    colCount: cc,
    rawValues,
    values: computed,
    rowIds,
    filtersEnabled: snapshot.filtersEnabled ?? false,
    filters: snapshot.filters ? { ...snapshot.filters } : undefined,
    freeze: snapshot.freeze ?? { rows: 0, cols: 0 },
    cellComments: snapshot.cellComments ? { ...snapshot.cellComments } : undefined,
    activeCell: { row: 0, col: 0 },
    selection: { r1: 0, c1: 0, r2: 0, c2: 0 },
    isEditing: false,
    editorValue: '',
    editCell: null,
    selectionAnchor: { row: 0, col: 0 },
    undoStack: [],
    redoStack: [],
    cellStyles,
    columnWidths,
    rowHeights,
    columns: cols.length > 0 ? cols : undefined,
    locale,
    computedColumns,
    version: 0,
  };
}
