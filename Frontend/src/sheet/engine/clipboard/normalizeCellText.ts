/**
 * Normalize pasted cell text for UA locale. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { parseLocaleNumber } from '../number/parseNumber';

const NBSP = '\u00A0';

export type NormalizedCell = {
  raw: string;
  suggestedType?: 'number' | 'percent' | 'uah' | 'text';
};

/**
 * Normalize pasted cell: trim, NBSP→space, detect %/₴/number.
 * Don't break text — if parsing doubtful, leave as text.
 */
export function normalizePastedCell(
  text: string,
  locale: LocaleSettings,
): NormalizedCell {
  let s = (text || '').trim();
  s = s.replace(new RegExp(NBSP, 'g'), ' ');

  if (!s) return { raw: '' };

  if (s.endsWith('%')) {
    const withoutPercent = s.slice(0, -1).trim();
    const n = parseLocaleNumber(withoutPercent, locale);
    if (n != null) {
      return { raw: s, suggestedType: 'percent' };
    }
  }

  if (s.includes('₴')) {
    const withoutUah = s.replace(/₴/g, '').trim();
    const n = parseLocaleNumber(withoutUah, locale);
    if (n != null) {
      return { raw: s, suggestedType: 'uah' };
    }
  }

  const n = parseLocaleNumber(s, locale);
  if (n != null) {
    return { raw: s, suggestedType: 'number' };
  }

  return { raw: s };
}
