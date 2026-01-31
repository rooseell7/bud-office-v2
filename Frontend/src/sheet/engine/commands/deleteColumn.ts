/**
 * Delete column command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import type { SheetColumn } from '../types';
import { cellKey } from '../state';
import { computeValues } from '../formulas/compute';
import { shiftAllFormulas, type FormulaDiff } from '../formulas/shiftAllFormulas';

function remapCellStylesForColDelete(
  cellStyles: Record<string, import('../types').CellStyle>,
  atCol: number,
): Record<string, import('../types').CellStyle> {
  if (!cellStyles || Object.keys(cellStyles).length === 0) return cellStyles;
  const next: Record<string, import('../types').CellStyle> = {};
  for (const [key, style] of Object.entries(cellStyles)) {
    const [r, c] = key.split(':').map(Number);
    if (c < atCol) next[key] = style;
    else if (c > atCol) next[cellKey(r, c - 1)] = style;
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

export type ComputedColumnDef = {
  col: number;
  compute: (row: number, getNum: (r: number, c: number) => number) => number;
};

export type DeleteColumnPayload = {
  colIndex: number;
  deletedColumn: SheetColumn;
  deletedWidth: number;
  deletedRawCol: string[];
  deletedStylesCol: Record<string, import('../types').CellStyle>;
  prevComputedColumns?: ComputedColumnDef[];
};

type CommandWithDiffs = SheetCommand & { _formulaDiffs?: FormulaDiff[] };

export function createDeleteColumnCommand(payload: DeleteColumnPayload): SheetCommand {
  const {
    colIndex,
    deletedColumn,
    deletedWidth,
    deletedRawCol,
    deletedStylesCol,
    prevComputedColumns,
  } = payload;

  const cmd: CommandWithDiffs = {
    do(state: SheetState): SheetState {
      const atCol = Math.max(0, Math.min(colIndex, state.colCount - 1));
      const colCount = state.colCount - 1;

      const { rawValues: shiftedRaw, formulaDiffs } = shiftAllFormulas(
        state.rawValues,
        state.rowCount,
        state.colCount,
        { type: 'delete_col', index: atCol },
      );
      cmd._formulaDiffs = formulaDiffs;

      const rawValues = shiftedRaw.map((row) => {
        const arr = row.filter((_, c) => c !== atCol);
        return arr.slice(0, colCount);
      });
      const adjustedComputed = state.computedColumns?.map((def) =>
        def.col > atCol ? { ...def, col: def.col - 1 } : def,
      ).filter((d) => d.col !== atCol) as typeof state.computedColumns;
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
      const cellStyles = remapCellStylesForColDelete(state.cellStyles ?? {}, atCol);
      const columnWidths = remapColumnWidths(state.columnWidths ?? {}, atCol, false);

      let { activeCell, selection } = state;
      if (activeCell.col === atCol) {
        activeCell = { ...activeCell, col: Math.max(0, Math.min(atCol, colCount - 1)) };
      } else if (activeCell.col > atCol) {
        activeCell = { ...activeCell, col: activeCell.col - 1 };
      }
      const sc1 = selection.c1 === atCol ? Math.min(selection.c1, selection.c2) : selection.c1;
      const sc2 = selection.c2 === atCol ? Math.max(selection.c1, selection.c2) : selection.c2;
      const nc1 = sc1 > atCol ? sc1 - 1 : sc1 === atCol ? Math.max(0, colCount - 1) : sc1;
      const nc2 = sc2 > atCol ? sc2 - 1 : sc2 === atCol ? Math.max(0, colCount - 1) : sc2;
      selection = { ...selection, c1: nc1, c2: nc2 };

      const computedColumns = state.computedColumns?.map((def) =>
        def.col > atCol ? { ...def, col: def.col - 1 } : def,
      ).filter((d) => d.col !== atCol) as typeof state.computedColumns;

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
      const atCol = Math.max(0, Math.min(colIndex, state.colCount));
      const colCount = state.colCount + 1;

      let rawValues = state.rawValues.map((row, r) => {
        const arr = [...row];
        const val = deletedRawCol[r] ?? '';
        arr.splice(atCol, 0, val);
        return arr.slice(0, colCount);
      });
      const diffs = cmd._formulaDiffs ?? [];
      for (const { r, c, prevRaw } of diffs) {
        if (r < rawValues.length && c < (rawValues[r]?.length ?? 0)) {
          rawValues = rawValues.map((row, ri) =>
            ri === r ? [...row.slice(0, c), prevRaw, ...row.slice(c + 1)] : [...row],
          );
        }
      }
      const baseColumns =
        state.columns ?? Array.from({ length: state.colCount }, (_, i) => ({
          id: `col-${i}`,
          title: `C${i + 1}`,
          type: 'text' as const,
          wrap: false,
          editable: true,
        }));
      const columns = [...baseColumns];
      columns.splice(atCol, 0, deletedColumn);

      const cellStyles: Record<string, import('../types').CellStyle> = {};
      for (const [key, style] of Object.entries(state.cellStyles ?? {})) {
        const [r, c] = key.split(':').map(Number);
        if (c < atCol) cellStyles[key] = style;
        else cellStyles[cellKey(r, c + 1)] = style;
      }
      for (const [key, style] of Object.entries(deletedStylesCol)) {
        cellStyles[key] = style;
      }
      const columnWidths = remapColumnWidths(
        { ...state.columnWidths, [atCol]: deletedWidth },
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

      const computedColumns =
        prevComputedColumns ??
        state.computedColumns?.map((def) =>
          def.col >= atCol ? { ...def, col: def.col + 1 } : def,
        );

      const values = computeValues(
        rawValues,
        state.rowCount,
        colCount,
        state.locale,
        computedColumns,
        columns,
        state.version,
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
