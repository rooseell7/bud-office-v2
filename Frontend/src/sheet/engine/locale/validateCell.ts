/**
 * Validate cell value by column type. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import type { SheetColumn } from '../types';
import type { CellError } from '../types';
import { isFormula } from '../formulas/parse';
import { parseUaNumber, parseUaMoney, parseUaPercent } from './uaParse';

export type ValidateOptions = {
  /** Min value for number/uah/percent (e.g. 0 for К-ть, Ціна, Собівартість) */
  min?: number;
};

export function validateCellByColumnType(
  raw: string,
  colType: SheetColumn['type'],
  locale: LocaleSettings,
  options?: ValidateOptions,
): { error?: CellError } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  if (isFormula(trimmed)) return {};

  const t = colType ?? 'text';
  if (t === 'text') return {};

  const minVal = options?.min ?? -Infinity;
  const invalidMsg = 'Некоректне число';

  if (t === 'number') {
    const r = parseUaNumber(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_NUMBER', message: invalidMsg } };
    if (r.value < minVal) return { error: { code: 'INVALID_NUMBER', message: invalidMsg } };
    return {};
  }
  if (t === 'uah') {
    const r = parseUaMoney(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_UAH', message: invalidMsg } };
    if (r.value < minVal) return { error: { code: 'INVALID_UAH', message: invalidMsg } };
    return {};
  }
  if (t === 'percent') {
    const r = parseUaPercent(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_PERCENT', message: invalidMsg } };
    if (r.value < minVal) return { error: { code: 'INVALID_PERCENT', message: invalidMsg } };
    return {};
  }
  return {};
}
