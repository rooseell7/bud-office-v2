/**
 * Parse numbers with locale. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';

/**
 * Parse a number string using locale settings.
 * "1 200,50" → 1200.5, "10,5" → 10.5
 * Also accepts dot as decimal (fallback for copy-paste).
 */
export function parseLocaleNumber(
  input: string,
  locale: LocaleSettings,
): number | null {
  const s = (input || '').trim();
  if (!s) return null;

  let normalized = s;

  if (locale.thousandsSeparator) {
    const esc = locale.thousandsSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(esc, 'g'), '');
  }

  if (locale.decimalSeparator === ',') {
    if (normalized.includes('.') && normalized.includes(',')) {
      const lastComma = normalized.lastIndexOf(',');
      const lastDot = normalized.lastIndexOf('.');
      normalized = lastComma > lastDot
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
