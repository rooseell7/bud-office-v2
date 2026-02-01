/**
 * UA locale formatting for display. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';

const defaultLocale: LocaleSettings = {
  decimalSeparator: ',',
  argSeparator: ';',
  thousandsSeparator: ' ',
};

function fmt(
  value: number,
  decimals: number,
  locale: LocaleSettings = defaultLocale,
): string {
  const decSep = locale.decimalSeparator ?? ',';
  const thousandsSep = locale.thousandsSeparator ?? ' ';
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = thousandsSep
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)
    : intPart;
  const dec = decPart ? decSep + decPart : '';
  return withThousands + dec;
}

/**
 * Format number: 1 234,50
 */
export function formatUaNumber(
  value: number,
  decimals = 2,
  locale?: LocaleSettings,
): string {
  return fmt(value, decimals, locale ?? defaultLocale);
}

/**
 * Format money: 1 234,50 ₴
 */
export function formatUaMoney(
  value: number,
  locale?: LocaleSettings,
  decimals?: number,
): string {
  const d = decimals ?? 2;
  return `${fmt(value, d, locale ?? defaultLocale)} ₴`;
}

/**
 * Format percent: 12,50% (value stored as percent, e.g. 12.5)
 */
export function formatUaPercent(
  value: number,
  decimals = 2,
  locale?: LocaleSettings,
): string {
  return `${fmt(value, decimals, locale ?? defaultLocale)}%`;
}
