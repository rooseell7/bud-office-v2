/**
 * Get sort key for a cell. Canonical sheet: src/sheet/**
 */

import type { SheetState } from '../state';
import { parseNumericCell } from '../number/parseCellValue';

/**
 * Returns sort key: string for text (normalized), number for numeric, null for empty.
 * null sorts last (nulls last).
 */
export function getSortKey(
  state: SheetState,
  rowIndex: number,
  colIndex: number,
): string | number | null {
  const raw = state.rawValues[rowIndex]?.[colIndex] ?? '';
  const display = state.values[rowIndex]?.[colIndex] ?? '';
  const trimmed = (raw || '').trim();

  if (trimmed === '') return null;

  const col = state.columns?.[colIndex];
  const colType = col?.type ?? 'text';

  if (colType === 'number' || colType === 'uah' || colType === 'percent') {
    const n = parseNumericCell(display || raw, state.locale);
    return n != null && Number.isFinite(n) ? n : null;
  }

  return (display || raw || '').toLowerCase().trim();
}
