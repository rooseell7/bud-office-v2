/**
 * Reflow row heights after column width change (wrap-aware). Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import type { SheetConfig } from '../configs/types';
import { formatForDisplay } from './number/formatNumber';
import { computeAutoFitRowHeight } from './autofitRow';

const MAX_ROWS_REFLOW = 200;

export type ReflowResult = {
  affectedRows: number[];
  prevHeights: number[];
  nextHeights: number[];
};

/**
 * After column width change, recalculate row heights for rows with non-empty text
 * in the wrap column. Only runs if column has wrap=true.
 */
export function reflowWrapRowsAfterColumnWidthChange(
  state: SheetState,
  colIndex: number,
  newColWidth: number,
  config?: Partial<SheetConfig> | null,
): ReflowResult {
  const colWrap = config?.columnWrap ?? [];
  if (!colWrap[colIndex]) {
    return { affectedRows: [], prevHeights: [], nextHeights: [] };
  }

  const defaultRowHeight = config?.rowHeight ?? 28;
  const defaultColWidth = 140;

  const getColWidth = (c: number): number => {
    if (c === colIndex) return newColWidth;
    return state.columnWidths?.[c] ?? config?.columnWidthDefaults?.[c] ?? defaultColWidth;
  };

  const affectedRows: number[] = [];
  const prevHeights: number[] = [];
  const nextHeights: number[] = [];

  const columnFormats = config?.columnFormats ?? [];
  const rowCount = Math.min(state.rowCount, MAX_ROWS_REFLOW);

  for (let r = 0; r < rowCount; r++) {
    const raw = state.rawValues[r]?.[colIndex] ?? '';
    const value = state.values[r]?.[colIndex] ?? raw;
    const displayVal = String(value ?? raw ?? '').trim();
    const cellStyle = state.cellStyles[`${r}:${colIndex}`];
    const format = cellStyle?.numberFormat ?? columnFormats[colIndex] ?? 'plain';
    const displayText = formatForDisplay(displayVal, format, state.locale) || displayVal;

    if (!displayText.trim()) continue;

    const prevH = state.rowHeights?.[r] ?? defaultRowHeight;
    const nextH = computeAutoFitRowHeight(state, r, config, getColWidth);

    if (nextH !== prevH) {
      affectedRows.push(r);
      prevHeights.push(prevH);
      nextHeights.push(nextH);
    }
  }

  return { affectedRows, prevHeights, nextHeights };
}
