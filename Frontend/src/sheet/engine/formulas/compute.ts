/**
 * Compute values from raw. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { defaultLocale } from '../../configs/types';
import { parseLocaleNumber } from '../number/parseNumber';
import { parseFormula, isFormula } from './parse';
import { evaluateFormula } from './evaluate';

export function computeValues(
  rawValues: string[][],
  rowCount: number,
  colCount: number,
  locale: LocaleSettings = defaultLocale,
): string[][] {
  const values: string[][] = [];
  const cache = new Map<string, string | number>();

  const getCellValue = (row: number, col: number, visited: Set<string>): string | number => {
    const key = `${row}:${col}`;
    if (visited.has(key)) return '#CYCLE!';
    if (row < 0 || row >= rowCount || col < 0 || col >= colCount) return 0;
    if (cache.has(key)) return cache.get(key)!;

    const raw = rawValues[row]?.[col] ?? '';
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      cache.set(key, '');
      return '';
    }
    if (!isFormula(trimmed)) {
      const n = parseLocaleNumber(trimmed, locale);
      cache.set(key, n != null ? n : trimmed);
      return cache.get(key)!;
    }

    const ast = parseFormula(trimmed, locale);
    if (!ast) {
      cache.set(key, trimmed);
      return trimmed;
    }
    visited.add(key);
    const result = evaluateFormula(ast, (r, c) => getCellValue(r, c, visited), locale);
    visited.delete(key);
    cache.set(key, result);
    return result;
  };

  for (let r = 0; r < rowCount; r++) {
    values[r] = [];
    for (let c = 0; c < colCount; c++) {
      const v = getCellValue(r, c, new Set());
      values[r][c] = typeof v === 'number' ? String(v) : (v || '');
    }
  }
  return values;
}
