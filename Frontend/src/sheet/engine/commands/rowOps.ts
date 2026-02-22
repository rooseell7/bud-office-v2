/**
 * Row insert/delete commands. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { cellKey, generateRowId } from '../state';
import { computeValues } from '../formulas/compute';
import { shiftAllFormulas, type FormulaDiff } from '../formulas/shiftAllFormulas';

function remapRowHeights(
  rowHeights: Record<number, number>,
  _rowDelta: number,
  atRow: number,
  isInsert: boolean,
): Record<number, number> {
  if (!rowHeights || Object.keys(rowHeights).length === 0) return rowHeights;
  const next: Record<number, number> = {};
  for (const [k, v] of Object.entries(rowHeights)) {
    const r = parseInt(k, 10);
    if (isNaN(r)) continue;
    if (isInsert) {
      if (r > atRow) next[r + 1] = v;
      else next[r] = v;
    } else {
      if (r === atRow) continue;
      if (r > atRow) next[r - 1] = v;
      else next[r] = v;
    }
  }
  return next;
}

function remapCellStyles(
  cellStyles: Record<string, import('../types').CellStyle>,
  _rowDelta: number,
  atRow: number,
  isInsert: boolean,
): Record<string, import('../types').CellStyle> {
  if (!cellStyles || Object.keys(cellStyles).length === 0) return cellStyles;
  const next: Record<string, import('../types').CellStyle> = {};
  for (const [key, style] of Object.entries(cellStyles)) {
    const [r, c] = key.split(':').map(Number);
    if (isInsert) {
      if (r > atRow) next[cellKey(r + 1, c)] = style;
      else if (r <= atRow) next[key] = style;
    } else {
      if (r === atRow) continue;
      if (r > atRow) next[cellKey(r - 1, c)] = style;
      else next[key] = style;
    }
  }
  return next;
}

type CommandWithDiffs = SheetCommand & {
  _formulaDiffs?: FormulaDiff[];
  _insertIdx?: number;
  _deleteIdx?: number;
};

/** @param insertAtIndex - index at which to insert the new row (0 = above first row) */
export function createInsertRowCommand(insertAtIndex: number): SheetCommand {
  const cmd: CommandWithDiffs = {
    do(state: SheetState): SheetState {
      const insertIdx = Math.max(0, Math.min(insertAtIndex, state.rowCount));
      const atRow = insertIdx - 1;
      const colCount = state.colCount;
      const emptyRow = Array(colCount).fill('');

      const { rawValues: shiftedRaw, formulaDiffs } = shiftAllFormulas(
        state.rawValues,
        state.rowCount,
        state.colCount,
        { type: 'insert_row', index: insertIdx },
      );
      cmd._formulaDiffs = formulaDiffs;
      cmd._insertIdx = insertIdx;

      const rawValues = [...shiftedRaw];
      rawValues.splice(insertIdx, 0, [...emptyRow]);

      const values = computeValues(
        rawValues,
        state.rowCount + 1,
        colCount,
        state.locale,
        state.computedColumns,
        state.columns,
        state.version,
      );

      const cellStyles = remapCellStyles(state.cellStyles, 1, atRow, true);
      const rowHeights = remapRowHeights(state.rowHeights ?? {}, 1, atRow, true);
      const rowIds = [...(state.rowIds ?? Array.from({ length: state.rowCount }, (_, i) => `row_${i}`))];
      rowIds.splice(insertIdx, 0, generateRowId());

      let { activeCell, selection } = state;
      if (activeCell.row >= insertIdx) {
        activeCell = { ...activeCell, row: activeCell.row + 1 };
        selection = {
          r1: Math.min(selection.r1, selection.r2) >= insertIdx ? selection.r1 + 1 : selection.r1,
          c1: selection.c1,
          r2: Math.max(selection.r1, selection.r2) >= insertIdx ? selection.r2 + 1 : selection.r2,
          c2: selection.c2,
        };
      }
      const anchor = state.selectionAnchor;
      const selectionAnchor =
        anchor && anchor.row >= insertIdx ? { ...anchor, row: anchor.row + 1 } : anchor;

      return {
        ...state,
        rowCount: state.rowCount + 1,
        rawValues,
        values,
        cellStyles,
        rowHeights,
        rowIds,
        activeCell,
        selection,
        selectionAnchor,
      };
    },
    undo(state: SheetState): SheetState {
      const deleteIdx = cmd._insertIdx ?? insertAtIndex;
      const rowCount = state.rowCount - 1;
      const rawValues = state.rawValues.filter((_, i) => i !== deleteIdx);
      const restored = rawValues.map((r) => [...r]);
      const diffs = cmd._formulaDiffs ?? [];
      for (const { r, c, prevRaw } of diffs) {
        const targetRow = r > deleteIdx ? r - 1 : r;
        if (r === deleteIdx) continue;
        if (targetRow < restored.length && c < (restored[targetRow]?.length ?? 0)) {
          restored[targetRow] = [...restored[targetRow]];
          restored[targetRow][c] = prevRaw;
        }
      }
      const values = computeValues(
        restored,
        rowCount,
        state.colCount,
        state.locale,
        state.computedColumns,
        state.columns,
        state.version,
      );
      const cellStyles = remapCellStyles(state.cellStyles ?? {}, -1, deleteIdx, false);
      const rowHeights = remapRowHeights(state.rowHeights ?? {}, -1, deleteIdx, false);
      const newRowIds = (state.rowIds ?? []).filter((_, i) => i !== deleteIdx);
      let activeCell = state.activeCell;
      if (activeCell.row === deleteIdx) {
        activeCell = { ...activeCell, row: Math.min(deleteIdx, rowCount - 1) };
      } else if (activeCell.row > deleteIdx) {
        activeCell = { ...activeCell, row: activeCell.row - 1 };
      }
      const r1 = state.selection.r1;
      const r2 = state.selection.r2;
      const sel = {
        r1: r1 > deleteIdx ? r1 - 1 : r1 === deleteIdx ? Math.min(0, rowCount - 1) : r1,
        c1: state.selection.c1,
        r2: r2 > deleteIdx ? r2 - 1 : r2 === deleteIdx ? Math.min(0, rowCount - 1) : r2,
        c2: state.selection.c2,
      };
      const anchor = state.selectionAnchor;
      const selectionAnchor =
        anchor && anchor.row > deleteIdx
          ? { ...anchor, row: anchor.row - 1 }
          : anchor && anchor.row === deleteIdx
            ? { ...anchor, row: 0 }
            : anchor;

      return {
        ...state,
        rowCount,
        rawValues: restored,
        values,
        cellStyles,
        rowHeights,
        rowIds: newRowIds,
        activeCell,
        selection: sel,
        selectionAnchor,
      };
    },
  };
  return cmd;
}

type CommandWithRowId = CommandWithDiffs & { _deletedRowId?: string };

/** Creates delete command; capturedRow must be the row content before delete (from state.rawValues[deleteRowIndex]) */
export function createDeleteRowCommand(
  deleteRowIndex: number,
  capturedRow?: string[],
): SheetCommand {
  const cmd: CommandWithRowId = {
    do(state: SheetState): SheetState {
      if (state.rowCount <= 1) return state;
      const deleteIdx = Math.max(0, Math.min(deleteRowIndex, state.rowCount - 1));
      const colCount = state.colCount;

      const { rawValues: shiftedRaw, formulaDiffs } = shiftAllFormulas(
        state.rawValues,
        state.rowCount,
        state.colCount,
        { type: 'delete_row', index: deleteIdx },
      );
      cmd._formulaDiffs = formulaDiffs;
      cmd._deleteIdx = deleteIdx;

      const rawValues = shiftedRaw.filter((_, i) => i !== deleteIdx);
      const values = computeValues(
        rawValues,
        state.rowCount - 1,
        colCount,
        state.locale,
        state.computedColumns,
        state.columns,
        state.version,
      );

      const cellStyles = remapCellStyles(state.cellStyles, -1, deleteIdx, false);
      const rowHeights = remapRowHeights(state.rowHeights ?? {}, -1, deleteIdx, false);
      const rowIds = (state.rowIds ?? []);
      cmd._deletedRowId = rowIds[deleteIdx];
      const newRowIds = rowIds.filter((_, i) => i !== deleteIdx);

      let { activeCell, selection } = state;
      if (activeCell.row === deleteIdx) {
        activeCell = { ...activeCell, row: Math.min(deleteIdx, state.rowCount - 2) };
      } else if (activeCell.row > deleteIdx) {
        activeCell = { ...activeCell, row: activeCell.row - 1 };
      }
      const r1 = selection.r1 === deleteIdx ? Math.min(selection.r1, selection.r2) : selection.r1;
      const r2 = selection.r2 === deleteIdx ? Math.max(selection.r1, selection.r2) : selection.r2;
      selection = {
        r1: r1 > deleteIdx ? r1 - 1 : (r1 === deleteIdx ? Math.min(0, state.rowCount - 2) : r1),
        c1: selection.c1,
        r2: r2 > deleteIdx ? r2 - 1 : (r2 === deleteIdx ? Math.min(0, state.rowCount - 2) : r2),
        c2: selection.c2,
      };
      const anchor = state.selectionAnchor;
      const selectionAnchor =
        anchor && anchor.row > deleteIdx
          ? { ...anchor, row: anchor.row - 1 }
          : anchor && anchor.row === deleteIdx
            ? { ...anchor, row: 0 }
            : anchor;

      return {
        ...state,
        rowCount: state.rowCount - 1,
        rawValues,
        values,
        cellStyles,
        rowHeights,
        rowIds: newRowIds,
        activeCell,
        selection,
        selectionAnchor,
      };
    },
    undo(state: SheetState): SheetState {
      const insertIdx = cmd._deleteIdx ?? deleteRowIndex;
      const rowCount = state.rowCount + 1;
      const rawValues = state.rawValues.map((r) => [...r]);
      rawValues.splice(insertIdx, 0, capturedRow?.length
        ? [...capturedRow].slice(0, state.colCount)
        : Array(state.colCount).fill(''));
      while (rawValues[insertIdx].length < state.colCount) {
        rawValues[insertIdx].push('');
      }
      rawValues[insertIdx] = rawValues[insertIdx].slice(0, state.colCount);

      const diffs = cmd._formulaDiffs ?? [];
      for (const { r, c, prevRaw } of diffs) {
        if (r < rawValues.length && c < (rawValues[r]?.length ?? 0)) {
          rawValues[r] = [...rawValues[r]];
          rawValues[r][c] = prevRaw;
        }
      }
      const values = computeValues(
        rawValues,
        rowCount,
        state.colCount,
        state.locale,
        state.computedColumns,
        state.columns,
        state.version,
      );
      const cellStyles: Record<string, import('../types').CellStyle> = {};
      for (const [key, style] of Object.entries(state.cellStyles ?? {})) {
        const [row, col] = key.split(':').map(Number);
        if (row >= insertIdx) {
          cellStyles[cellKey(row + 1, col)] = style;
        } else {
          cellStyles[key] = style;
        }
      }
      const rowHeights: Record<number, number> = {};
      for (const [k, v] of Object.entries(state.rowHeights ?? {})) {
        const row = parseInt(k, 10);
        if (row >= insertIdx) rowHeights[row + 1] = v;
        else rowHeights[row] = v;
      }
      let activeCell = state.activeCell;
      if (activeCell.row >= insertIdx) {
        activeCell = { ...activeCell, row: activeCell.row + 1 };
      }
      const sel = {
        r1: state.selection.r1 >= insertIdx ? state.selection.r1 + 1 : state.selection.r1,
        c1: state.selection.c1,
        r2: state.selection.r2 >= insertIdx ? state.selection.r2 + 1 : state.selection.r2,
        c2: state.selection.c2,
      };
      const anchor = state.selectionAnchor;
      const selectionAnchor =
        anchor && anchor.row >= insertIdx ? { ...anchor, row: anchor.row + 1 } : anchor;
      const rowIds = [...(state.rowIds ?? [])];
      rowIds.splice(insertIdx, 0, cmd._deletedRowId ?? generateRowId());
      return {
        ...state,
        rowCount,
        rawValues,
        values,
        cellStyles,
        rowHeights,
        rowIds,
        activeCell,
        selection: sel,
        selectionAnchor,
      };
    },
  };
  return cmd;
}
