/**
 * Auto-fit column width from content. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import type { SheetConfig } from '../configs/types';
import { measureTextPx } from './measureText';
import { formatForDisplay } from './number/formatNumber';
import { clampColWidth } from './resizeConstants';

const CELL_PADDING_PX = 24;
const AUTO_FIT_FONT = '13px Mulish, sans-serif';
const MAX_ROWS_SCAN = 200;

export type AutoFitOptions = {
  maxRows?: number;
  cellPaddingPx?: number;
  font?: string;
};

/**
 * Compute auto-fit width for a column based on content.
 * Scans rows (max 200 or visible), measures display text, returns clamped width.
 */
export function computeAutoFitWidth(
  state: SheetState,
  colIndex: number,
  config?: Partial<SheetConfig> | null,
  options?: AutoFitOptions,
): number {
  const maxRows = options?.maxRows ?? MAX_ROWS_SCAN;
  const padding = options?.cellPaddingPx ?? CELL_PADDING_PX;
  const font = options?.font ?? AUTO_FIT_FONT;

  const colCount = state.colCount;
  const rowCount = state.rowCount;
  const col = Math.max(0, Math.min(colIndex, colCount - 1));
  const rowsToScan = Math.min(rowCount, maxRows);

  const columnFormats = config?.columnFormats ?? [];
  const format = columnFormats[col] ?? 'plain';

  let maxW = 0;
  for (let r = 0; r < rowsToScan; r++) {
    const raw = state.rawValues[r]?.[col] ?? '';
    const value = state.values[r]?.[col] ?? raw;
    const displayVal = String(value ?? raw ?? '').trim();
    const cellStyle = state.cellStyles[`${r}:${col}`];
    const numFormat = cellStyle?.numberFormat ?? format;
    const displayText = formatForDisplay(displayVal, numFormat, state.locale) || displayVal || ' ';
    const w = measureTextPx(displayText, font);
    if (w > maxW) maxW = w;
  }

  const header = config?.columnHeaders?.[col];
  if (header) {
    const headerW = measureTextPx(header, '12px 600 Mulish, sans-serif');
    if (headerW > maxW) maxW = headerW;
  }

  return clampColWidth(maxW + padding);
}
