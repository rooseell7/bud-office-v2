/**
 * Insert column command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import type { SheetColumn } from '../types';
import { cellKey } from '../state';
import { computeValues } from '../formulas/compute';
import { shiftAllFormulas, type FormulaDiff } from '../formulas/shiftAllFormulas';

function remapCellStylesForColInsert(
  cellStyles: Record<string, import('../types').CellStyle>,
  atCol: number,
): Record<string, import('../types').CellStyle> {
  if (!cellStyles || Object.keys(cellStyles).length === 0) return cellStyles;
  const next: Record<string, import('../types').CellStyle> = {};
  for (const [key, style] of Object.entries(cellStyles)) {
    const [r, c] = key.split(':').map(Number);
    if (c >= atCol) {
      next[cellKey(r, c + 1)] = style;
    } else {
      next[key] = style;
    }
  }
  return next;
}

function remapColumnWidths(
  columnWidths: Record<number, number>,
  atCol: number,
  isInsert: boolean,
): Record<number, number> {
  if (!columnWidths || Object.keys(columnWidths).length === 0) return columnWidths;
  const next: Record<number, number> = {};
  for (const [k, v] of Object.entries(columnWidths)) {
    const c = parseInt(k, 10);
    if (isNaN(c)) continue;
    if (isInsert) {
      if (c >= atCol) next[c + 1] = v;
      else next[c] = v;
    } else {
      if (c === atCol) continue;
      if (c > atCol) next[c - 1] = v;
      else next[c] = v;
    }
  }
  return next;
}

type CommandWithDiffs = SheetCommand & { _formulaDiffs?: FormulaDiff[] };

export function createInsertColumnCommand(
  atIndex: number,
  column: SheetColumn,
  defaultWidth: number,
): SheetCommand {
  const cmd: CommandWithDiffs = {
    do(state: SheetState): SheetState {
      const atCol = Math.max(0, Math.min(atIndex, state.colCount));
      const colCount = state.colCount + 1;

      const { rawValues: shiftedRaw, formulaDiffs } = shiftAllFormulas(
        state.rawValues,
        state.rowCount,
        state.colCount,
        { type: 'insert_col', index: atCol },
      );
      cmd._formulaDiffs = formulaDiffs;

      const rawValues = shiftedRaw.map((row) => {
        const arr = [...row];
        arr.splice(atCol, 0, '');
        return arr.slice(0, colCount);
      });
      const baseColumns =
        state.columns ?? Array.from({ length: state.colCount }, (_, i) => ({
          id: `col-${i}`,
          title: `C${i + 1}`,
          type: 'text' as const,
          wrap: false,
          editable: true,
        }));
      const columns = [...baseColumns];
      columns.splice(atCol, 0, column);

      const values = computeValues(
        rawValues,
        state.rowCount,
        colCount,
        state.locale,
        state.computedColumns,
        columns,
        state.version,
      );

      const cellStyles = remapCellStylesForColInsert(state.cellStyles ?? {}, atCol);
      const columnWidths = remapColumnWidths(
        { ...state.columnWidths, [atCol]: defaultWidth },
        atCol,
        true,
      );

      let { activeCell, selection } = state;
      if (activeCell.col >= atCol) {
        activeCell = { ...activeCell, col: activeCell.col + 1 };
      }
      const c1 = selection.c1 >= atCol ? selection.c1 + 1 : selection.c1;
      const c2 = selection.c2 >= atCol ? selection.c2 + 1 : selection.c2;
      selection = { ...selection, c1, c2 };

      const computedColumns = state.computedColumns?.map((def) =>
        def.col >= atCol ? { ...def, col: def.col + 1 } : def,
      );

      return {
        ...state,
        colCount,
        rawValues,
        values,
        columns,
        cellStyles,
        columnWidths,
        activeCell,
        selection,
        computedColumns,
      };
    },
    undo(state: SheetState): SheetState {
      const atCol = Math.max(0, Math.min(atIndex, state.colCount - 1));
      const colCount = state.colCount - 1;

      let rawValues = state.rawValues.map((row) => {
        const arr = row.filter((_, c) => c !== atCol);
        return arr.slice(0, colCount);
      });
      const diffs = cmd._formulaDiffs ?? [];
      for (const { r, c, prevRaw } of diffs) {
        if (c === atCol) continue;
        const targetCol = c > atCol ? c - 1 : c;
        if (r < rawValues.length && targetCol < (rawValues[r]?.length ?? 0)) {
          rawValues = rawValues.map((row, ri) =>
            ri === r ? [...row.slice(0, targetCol), prevRaw, ...row.slice(targetCol + 1)] : [...row],
          );
        }
      }
      const adjustedComputed = state.computedColumns?.map((def) =>
        def.col > atCol ? { ...def, col: def.col - 1 } : def,
      );
      const columns = state.columns?.filter((_, i) => i !== atCol) ?? [];
      const values = computeValues(
        rawValues,
        state.rowCount,
        colCount,
        state.locale,
        adjustedComputed,
        columns.length ? columns : undefined,
        state.version,
      );
      const cellStyles: Record<string, import('../types').CellStyle> = {};
      for (const [key, style] of Object.entries(state.cellStyles ?? {})) {
        const [r, c] = key.split(':').map(Number);
        if (c < atCol) cellStyles[key] = style;
        else if (c > atCol) cellStyles[cellKey(r, c - 1)] = style;
      }
      const columnWidths = remapColumnWidths(state.columnWidths ?? {}, atCol, false);

      let { activeCell, selection } = state;
      if (activeCell.col > atCol) {
        activeCell = { ...activeCell, col: activeCell.col - 1 };
      } else if (activeCell.col === atCol) {
        activeCell = { ...activeCell, col: Math.min(atCol, colCount - 1) };
      }
      const c1 =
        selection.c1 > atCol
          ? selection.c1 - 1
          : selection.c1 === atCol
            ? Math.min(atCol, colCount - 1)
            : selection.c1;
      const c2 =
        selection.c2 > atCol
          ? selection.c2 - 1
          : selection.c2 === atCol
            ? Math.min(atCol, colCount - 1)
            : selection.c2;
      selection = { ...selection, c1, c2 };

      const computedColumns = state.computedColumns?.map((def) =>
        def.col > atCol ? { ...def, col: def.col - 1 } : def,
      );

      return {
        ...state,
        colCount,
        rawValues,
        values,
        columns,
        cellStyles,
        columnWidths,
        activeCell,
        selection,
        computedColumns,
      };
    },
  };
  return cmd;
}
