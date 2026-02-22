/**
 * Sort rows command. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { cellKey } from '../state';
import { computeValues } from '../formulas/compute';
import { getSortKey } from '../fill/getSortKey';

/** order[i] = source row index for new position i */
function remapStylesByPermutation(
  cellStyles: Record<string, import('../types').CellStyle>,
  order: number[],
): Record<string, import('../types').CellStyle> {
  if (!cellStyles || Object.keys(cellStyles).length === 0) return cellStyles;
  const next: Record<string, import('../types').CellStyle> = {};
  for (const [key, style] of Object.entries(cellStyles)) {
    const [r, c] = key.split(':').map(Number);
    const newPos = order.indexOf(r);
    if (newPos >= 0) next[cellKey(newPos, c)] = style;
  }
  return next;
}

function permuteRows<T>(arr: T[], perm: number[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < perm.length; i++) {
    out[i] = arr[perm[i]];
  }
  return out;
}

type SortCommand = SheetCommand & {
  _prevRaw?: string[][];
  _prevValues?: string[][];
  _prevStyles?: Record<string, import('../types').CellStyle>;
  _prevHeights?: Record<number, number>;
  _prevRowIds?: string[];
  _prevErrors?: Record<string, import('../types').CellError>;
  _prevActive?: import('../types').CellCoord;
  _prevSelection?: import('../types').SelectionRange;
  _prevAnchor?: import('../types').CellCoord | null;
};

export function createSortRowsCommand(
  sortByColIndex: number,
  direction: 'asc' | 'desc',
): SheetCommand {
  const cmd: SortCommand = {
    do(state: SheetState): SheetState {
      if (state.isEditing) return state;

      const { rowCount, colCount, rawValues, values: _values, rowHeights: _rowHeights, rowIds } = state;
      const indices = Array.from({ length: rowCount }, (_, i) => i);

      indices.sort((a, b) => {
        const keyA = getSortKey(state, a, sortByColIndex);
        const keyB = getSortKey(state, b, sortByColIndex);

        const nullsLast = (x: string | number | null) =>
          x === null ? 1 : 0;
        const na = nullsLast(keyA);
        const nb = nullsLast(keyB);
        if (na !== nb) return na - nb;

        let cmp = 0;
        if (keyA === null && keyB === null) {
          cmp = 0;
        } else if (typeof keyA === 'number' && typeof keyB === 'number') {
          cmp = keyA - keyB;
        } else {
          cmp = String(keyA).localeCompare(String(keyB));
        }

        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
        return (rowIds?.[a] ?? '').localeCompare(rowIds?.[b] ?? '');
      });

      const perm = new Array(rowCount);
      for (let i = 0; i < rowCount; i++) perm[indices[i]] = i;

      const newRaw = permuteRows(rawValues, indices);
      const newValues = computeValues(
        newRaw,
        rowCount,
        colCount,
        state.locale,
        state.computedColumns,
        state.columns,
        state.version,
      );

      const newHeights: Record<number, number> = {};
      if (state.rowHeights) {
        for (const [k, v] of Object.entries(state.rowHeights)) {
          const r = parseInt(k, 10);
          if (!isNaN(r)) {
            const newPos = indices.indexOf(r);
            if (newPos >= 0) newHeights[newPos] = v;
          }
        }
      }

      const newRowIds = permuteRows(rowIds ?? indices.map((i) => `row_${i}`), indices);
      const newStyles = remapStylesByPermutation(state.cellStyles ?? {}, indices);

      const newCellErrors: Record<string, import('../types').CellError> = {};
      if (state.cellErrors) {
        for (const [key, err] of Object.entries(state.cellErrors)) {
          const [r, c] = key.split(':').map(Number);
          const newPos = indices.indexOf(r);
          if (newPos >= 0) newCellErrors[cellKey(newPos, c)] = err;
        }
      }

      const activeRowId = rowIds?.[state.activeCell.row];
      const newActiveRow =
        activeRowId != null ? newRowIds.indexOf(activeRowId) : state.activeCell.row;
      const newActiveRowClamped = Math.max(0, Math.min(newActiveRow, rowCount - 1));

      const mapRow = (r: number) => {
        const id = rowIds?.[r];
        return id != null ? newRowIds.indexOf(id) : r;
      };

      cmd._prevRaw = state.rawValues.map((r) => [...r]);
      cmd._prevValues = state.values.map((r) => [...r]);
      cmd._prevStyles = state.cellStyles ? { ...state.cellStyles } : undefined;
      cmd._prevHeights = state.rowHeights ? { ...state.rowHeights } : undefined;
      cmd._prevRowIds = state.rowIds ? [...state.rowIds] : undefined;
      cmd._prevErrors = state.cellErrors ? { ...state.cellErrors } : undefined;
      cmd._prevActive = { ...state.activeCell };
      cmd._prevSelection = { ...state.selection };
      cmd._prevAnchor = state.selectionAnchor ? { ...state.selectionAnchor } : null;

      return {
        ...state,
        rawValues: newRaw,
        values: newValues,
        cellStyles: newStyles,
        rowHeights: Object.keys(newHeights).length ? newHeights : state.rowHeights,
        rowIds: newRowIds,
        cellErrors: Object.keys(newCellErrors).length ? newCellErrors : undefined,
        activeCell: {
          row: newActiveRowClamped,
          col: state.activeCell.col,
        },
        selection: {
          r1: Math.min(mapRow(state.selection.r1), mapRow(state.selection.r2)),
          c1: state.selection.c1,
          r2: Math.max(mapRow(state.selection.r1), mapRow(state.selection.r2)),
          c2: state.selection.c2,
        },
        selectionAnchor: state.selectionAnchor
          ? {
              row: Math.max(0, Math.min(mapRow(state.selectionAnchor.row), rowCount - 1)),
              col: state.selectionAnchor.col,
            }
          : null,
      };
    },
    undo(state: SheetState): SheetState {
      if (!cmd._prevRaw) return state;
      return {
        ...state,
        rawValues: cmd._prevRaw,
        values: cmd._prevValues!,
        cellStyles: cmd._prevStyles ?? {},
        rowHeights: cmd._prevHeights ?? {},
        rowIds: cmd._prevRowIds,
        cellErrors: cmd._prevErrors,
        activeCell: cmd._prevActive!,
        selection: cmd._prevSelection!,
        selectionAnchor: cmd._prevAnchor ?? null,
      };
    },
  };
  return cmd;
}
