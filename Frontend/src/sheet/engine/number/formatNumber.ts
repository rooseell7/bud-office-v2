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
 * @param decimalPlaces optional override (0-6) for number/uah/percent
 */
/** Display format: plain/number/uah/percent from config; 'text' treated like plain for compatibility. */
export type FormatForDisplayKind = 'plain' | 'number' | 'uah' | 'percent' | 'text';

export function formatForDisplay(
  value: string,
  numberFormat: FormatForDisplayKind,
  locale: LocaleSettings = defaultLocale,
  decimalPlaces?: number,
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

  const dec = decimalPlaces != null ? Math.max(0, Math.min(6, decimalPlaces)) : 2;
  switch (numberFormat) {
    case 'number':
      return formatUaNumber(n, dec, locale);
    case 'uah':
      return formatUaMoney(n, locale, dec);
    case 'percent':
      return formatUaPercent(n, dec, locale);
    case 'text':
    case 'plain':
    default:
      return formatUaNumber(n, dec, locale);
  }
}
