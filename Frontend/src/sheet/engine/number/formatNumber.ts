/**
 * Format numbers for display. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { defaultLocale } from '../../configs/types';
import { parseLocaleNumber } from './parseNumber';
import { parseUaMoney, parseUaPercent } from '../locale/uaParse';
import { formatUaNumber, formatUaMoney, formatUaPercent } from '../locale/uaFormat';

/**
 * Format a value for display using locale and numberFormat.
 * Value can be normalized number string or raw with ₴/%.
 */
export function formatForDisplay(
  value: string,
  numberFormat: 'plain' | 'number' | 'uah' | 'percent',
  locale: LocaleSettings = defaultLocale,
): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  let n: number | null = parseLocaleNumber(trimmed, locale);
  if (n == null && numberFormat === 'uah') {
    const r = parseUaMoney(trimmed, locale);
    n = r.ok ? r.value : null;
  }
  if (n == null && numberFormat === 'percent') {
    const r = parseUaPercent(trimmed, locale);
    n = r.ok ? r.value : null;
  }
  if (n == null) return trimmed;

  switch (numberFormat) {
    case 'number':
      return n % 1 === 0 ? String(Math.round(n)) : formatUaNumber(n, 2, locale);
    case 'uah':
      return formatUaMoney(n, locale);
    case 'percent':
      return formatUaPercent(n, 2, locale);
    case 'plain':
    default:
      return n % 1 === 0 ? String(Math.round(n)) : formatUaNumber(n, 2, locale);
  }
}
