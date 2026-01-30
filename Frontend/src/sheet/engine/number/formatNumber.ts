/**
 * Format numbers for display. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { defaultLocale } from '../../configs/types';
import { parseLocaleNumber } from './parseNumber';

/**
 * Format a value for display using locale and numberFormat.
 * Raw stays as user typed; this is for display only.
 */
export function formatForDisplay(
  value: string,
  numberFormat: 'plain' | 'number' | 'uah' | 'percent',
  locale: LocaleSettings = defaultLocale,
): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const n = parseLocaleNumber(trimmed, locale);
  if (n == null) return trimmed; // text, keep as-is

  const decSep = locale.decimalSeparator;
  const thousandsSep = locale.thousandsSeparator ?? '';

  function fmtNum(x: number, decimals: number): string {
    const fixed = x.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const withThousands = thousandsSep
      ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)
      : intPart;
    const dec = decPart ? decSep + decPart : '';
    return withThousands + dec;
  }

  switch (numberFormat) {
    case 'number':
      return fmtNum(n, 2);
    case 'uah':
      return `${fmtNum(n, 2)} ₴`;
    case 'percent':
      return `${fmtNum(n * 100, 1)}%`;
    case 'plain':
    default:
      return n % 1 === 0 ? String(Math.round(n)) : fmtNum(n, 2);
  }
}
