/**
 * Compute row visibility from filters. Canonical sheet: src/sheet/**
 */

import type { SheetState } from '../state';
import { parseNumericCell } from '../number/parseCellValue';

/**
 * Returns boolean[] where visible[r] === true means row r is visible.
 */
export function computeRowVisibility(state: SheetState): boolean[] {
  const { rowCount, filtersEnabled, filters, values, rawValues, locale, columns } = state;
  const visible: boolean[] = Array(rowCount).fill(true);
  if (!filtersEnabled || !filters || Object.keys(filters).length === 0) {
    return visible;
  }

  const colCount = state.colCount;
  const cols = columns ?? [];

  for (let r = 0; r < rowCount; r++) {
    for (const [colIdOrKey, spec] of Object.entries(filters)) {
      const colIdx = cols.findIndex(
        (c) => c?.id === colIdOrKey || c?.key === colIdOrKey,
      );
      if (colIdx < 0 || colIdx >= colCount) continue;

      const raw = rawValues[r]?.[colIdx] ?? '';
      const display = values[r]?.[colIdx] ?? '';
      const isEmpty = (raw || '').trim() === '';

      if (spec.type === 'text') {
        if (spec.isEmpty === true && !isEmpty) {
          visible[r] = false;
          break;
        }
        if (spec.isNotEmpty === true && isEmpty) {
          visible[r] = false;
          break;
        }
        if (spec.contains != null && spec.contains.trim() !== '') {
          const haystack = (display || raw || '').toLowerCase();
          const needle = spec.contains.trim().toLowerCase();
          if (!haystack.includes(needle)) {
            visible[r] = false;
            break;
          }
        }
      } else if (spec.type === 'number') {
        if (spec.isEmpty === true && !isEmpty) {
          visible[r] = false;
          break;
        }
        if (spec.isNotEmpty === true && isEmpty) {
          visible[r] = false;
          break;
        }
        if (spec.min != null || spec.max != null) {
          const n = parseNumericCell(display || raw, locale);
          const num = n != null && Number.isFinite(n) ? n : null;
          if (num === null) {
            visible[r] = false;
            break;
          }
          if (spec.min != null && num < spec.min) {
            visible[r] = false;
            break;
          }
          if (spec.max != null && num > spec.max) {
            visible[r] = false;
            break;
          }
        }
      }
    }
  }
  return visible;
}
