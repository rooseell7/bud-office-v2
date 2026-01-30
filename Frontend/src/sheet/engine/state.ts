/**
 * Sheet state. Canonical sheet: src/sheet/**
 */

import type { CellCoord, SelectionRange, CellStyle } from './types';
import type { SheetSnapshot } from './types';
import type { SheetCommand } from './commands/types';
import type { LocaleSettings } from '../configs/types';
import { defaultLocale } from '../configs/types';
import { computeValues } from './formulas/compute';

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
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
  /** UA locale for parse/format */
  locale: LocaleSettings;
};

/** Create initial empty state */
export function createInitialState(
  rowCount: number,
  colCount: number,
  locale: LocaleSettings = defaultLocale,
): SheetState {
  const values: string[][] = [];
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    values[r] = Array(colCount).fill('');
    rawValues[r] = Array(colCount).fill('');
  }
  return {
    rowCount,
    colCount,
    values,
    rawValues,
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
    locale,
  };
}

/** Create state from snapshot; pad/trim to fit rowCount×colCount */
export function createInitialStateFromSnapshot(
  rowCount: number,
  colCount: number,
  snapshot: SheetSnapshot,
  locale: LocaleSettings = defaultLocale,
): SheetState {
  const values: string[][] = [];
  const rawValues: string[][] = [];
  const srcRaw = snapshot.rawValues ?? snapshot.values ?? [];
  const src = snapshot.values ?? [];
  for (let r = 0; r < rowCount; r++) {
    const rowRaw = srcRaw[r];
    rawValues[r] = rowRaw ? [...rowRaw] : [];
    while (rawValues[r].length < colCount) rawValues[r].push('');
    rawValues[r] = rawValues[r].slice(0, colCount);

    const row = src[r];
    values[r] = row ? [...row] : [];
    while (values[r].length < colCount) values[r].push('');
    values[r] = values[r].slice(0, colCount);
  }
  const computed = computeValues(rawValues, rowCount, colCount, locale);
  const cellStyles = snapshot.styles ? { ...snapshot.styles } : {};
  return {
    rowCount,
    colCount,
    rawValues,
    values: computed,
    activeCell: { row: 0, col: 0 },
    selection: { r1: 0, c1: 0, r2: 0, c2: 0 },
    isEditing: false,
    editorValue: '',
    editCell: null,
    selectionAnchor: { row: 0, col: 0 },
    undoStack: [],
    redoStack: [],
    cellStyles,
    columnWidths: snapshot.columnWidths ? { ...snapshot.columnWidths } : {},
    locale,
  };
}
