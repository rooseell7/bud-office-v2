/**
 * Validate cell value by column type. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import type { SheetColumn } from '../types';
import type { CellError } from '../types';
import { isFormula } from '../formulas/parse';
import { parseUaNumber, parseUaMoney, parseUaPercent } from './uaParse';

export function validateCellByColumnType(
  raw: string,
  colType: SheetColumn['type'],
  locale: LocaleSettings,
): { error?: CellError } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return {};
  if (isFormula(trimmed)) return {};

  const t = colType ?? 'text';
  if (t === 'text') return {};

  if (t === 'number') {
    const r = parseUaNumber(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_NUMBER', message: r.reason } };
    return {};
  }
  if (t === 'uah') {
    const r = parseUaMoney(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_UAH', message: r.reason } };
    return {};
  }
  if (t === 'percent') {
    const r = parseUaPercent(trimmed, locale);
    if (!r.ok) return { error: { code: 'INVALID_PERCENT', message: r.reason } };
    return {};
  }
  return {};
}
