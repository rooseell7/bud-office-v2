/**
 * Auto-fit row height from wrapped content. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import type { SheetConfig } from '../configs/types';
import { measureTextPx } from './measureText';
import { formatForDisplay } from './number/formatNumber';
import { clampRowHeight } from './resizeConstants';

const LINE_HEIGHT_PX = 18;
const CELL_VERTICAL_PADDING = 10;
const CELL_HORIZONTAL_PADDING = 16;
const AUTO_FIT_FONT = '13px Mulish, sans-serif';

const linesCountCache = new Map<string, number>();

function getLinesCount(text: string, colWidthPx: number, font: string): number {
  const effectiveWidth = Math.max(40, colWidthPx - CELL_HORIZONTAL_PADDING);
  const key = `${font}|${effectiveWidth}|${text}`;
  const cached = linesCountCache.get(key);
  if (cached != null) return cached;

  const words = (text || ' ').split(/\s+/);
  if (words.length === 0) return 1;

  let lines = 1;
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = line + ' ' + words[i];
    const w = measureTextPx(next, font);
    if (w > effectiveWidth) {
      lines++;
      line = words[i];
    } else {
      line = next;
    }
  }
  linesCountCache.set(key, lines);
  return lines;
}

export type AutoFitRowOptions = {
  lineHeightPx?: number;
  cellVerticalPadding?: number;
  font?: string;
};

/**
 * Compute auto-fit height for a row based on wrapped content in wrap columns.
 * Scans only columns with wrap=true (e.g. "Найменування").
 */
export function computeAutoFitRowHeight(
  state: SheetState,
  rowIndex: number,
  config?: Partial<SheetConfig> | null,
  getColWidth?: (col: number) => number,
  options?: AutoFitRowOptions,
): number {
  const lineHeight = options?.lineHeightPx ?? LINE_HEIGHT_PX;
  const verticalPadding = options?.cellVerticalPadding ?? CELL_VERTICAL_PADDING;
  const font = options?.font ?? AUTO_FIT_FONT;

  const colWrap = config?.columnWrap ?? [];
  const columnFormats = config?.columnFormats ?? [];
  const defaultColWidth = 140;

  const getWidth = getColWidth ?? ((c: number) =>
    state.columnWidths?.[c] ?? config?.columnWidthDefaults?.[c] ?? defaultColWidth);

  let maxLines = 1;
  for (let c = 0; c < state.colCount; c++) {
    if (!colWrap[c]) continue;

    const raw = state.rawValues[rowIndex]?.[c] ?? '';
    const value = state.values[rowIndex]?.[c] ?? raw;
    const displayVal = String(value ?? raw ?? '').trim();
    const cellStyle = state.cellStyles[`${rowIndex}:${c}`];
    const format = cellStyle?.numberFormat ?? columnFormats[c] ?? 'plain';
    const displayText = formatForDisplay(displayVal, format, state.locale) || displayVal || ' ';

    const colWidth = getWidth(c);
    const lines = getLinesCount(displayText, colWidth, font);
    if (lines > maxLines) maxLines = lines;
  }

  const height = maxLines * lineHeight + verticalPadding;
  return clampRowHeight(height);
}
