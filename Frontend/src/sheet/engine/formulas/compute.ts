/**
 * Compute values from raw. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import type { ComputedColumnDef } from '../../configs/types';
import type { SheetColumn } from '../types';
import { defaultLocale } from '../../configs/types';
import { parseNumericCell } from '../number/parseCellValue';
import { parseFormula, isFormula } from './parse';
import { evaluateFormula } from './evaluate';
import { evaluateComputedCell } from '../computed/evaluateComputed';

export function computeValues(
  rawValues: string[][],
  rowCount: number,
  colCount: number,
  locale: LocaleSettings = defaultLocale,
  computedColumns?: ComputedColumnDef[],
  columns?: SheetColumn[],
  version?: number,
): string[][] {
  const values: string[][] = [];
  const cache = new Map<string, string | number>();
  const computedByCol = new Map<number, ComputedColumnDef>();
  if (computedColumns) {
    for (const def of computedColumns) computedByCol.set(def.col, def);
  }

  const getCellValue = (row: number, col: number, visited: Set<string>): string | number => {
    const key = `${row}:${col}`;
    if (visited.has(key)) return '#CYCLE!';
    if (row < 0 || row >= rowCount || col < 0 || col >= colCount) return 0;
    if (cache.has(key)) return cache.get(key)!;

    const colDef = columns?.[col];
    if (colDef?.computed?.expr && columns) {
      const getCell = (r: number, c: number) => getCellValue(r, c, visited);
      const getRaw = (r: number, c: number) => rawValues[r]?.[c] ?? '';
      const result = evaluateComputedCell(
        row,
        col,
        columns,
        getCell,
        locale,
        getRaw,
        rowCount,
        version ?? 0,
      );
      if (result === '#ERR') {
        cache.set(key, '#ERR');
        return '#ERR';
      }
      if (result != null && Number.isFinite(result)) {
        cache.set(key, result);
        return result;
      }
      cache.set(key, '');
      return '';
    }

    const def = computedByCol.get(col);
    if (def) {
      const getNum = (r: number, c: number): number => {
        const v = getCellValue(r, c, visited);
        if (typeof v === 'number') return v;
        const n = parseNumericCell(String(v), locale);
        return n ?? 0;
      };
      const num = def.compute(row, getNum);
      cache.set(key, num);
      return num;
    }

    const raw = rawValues[row]?.[col] ?? '';
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      cache.set(key, '');
      return '';
    }
    if (!isFormula(trimmed)) {
      const n = parseNumericCell(trimmed, locale);
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
      values[r][c] = v === '#ERR' ? '#ERR' : (typeof v === 'number' ? String(v) : (v || ''));
    }
  }
  return values;
}
