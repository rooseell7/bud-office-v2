/**
 * Parse cell value to number (for computed/formulas). Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { parseLocaleNumber } from './parseNumber';
import { parseUaMoney, parseUaPercent } from '../locale/uaParse';

export function parseNumericCell(raw: string, locale: LocaleSettings): number | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  let n = parseLocaleNumber(trimmed, locale);
  if (n != null) return n;
  if (trimmed.includes('%')) {
    const r = parseUaPercent(trimmed, locale);
    return r.ok ? r.value : null;
  }
  if (trimmed.includes('₴') || /грн/i.test(trimmed)) {
    const r = parseUaMoney(trimmed, locale);
    return r.ok ? r.value : null;
  }
  return null;
}
