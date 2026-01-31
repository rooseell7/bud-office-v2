/**
 * UA locale parsing: number, money, percent. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { parseLocaleNumber } from '../number/parseNumber';

export type ParseResultOk = { ok: true; value: number };
export type ParseResultFail = { ok: false; reason: string };
export type ParseResult = ParseResultOk | ParseResultFail;

const NBSP = '\u00A0';

function normalizeInput(s: string): string {
  return s.replace(new RegExp(NBSP, 'g'), ' ').trim();
}

/**
 * Parse UA number: spaces as thousand sep, comma/dot as decimal.
 * "10,5" → 10.5, "1 234,50" → 1234.5
 */
export function parseUaNumber(
  input: string,
  locale: LocaleSettings,
): ParseResult {
  const s = normalizeInput(input);
  if (!s) return { ok: true, value: 0 };
  const n = parseLocaleNumber(s, locale);
  if (n == null || !Number.isFinite(n)) return { ok: false, reason: 'Невірне число' };
  return { ok: true, value: n };
}

/**
 * Parse UA money: strip ₴, грн, then parse number.
 * "1 234,50 ₴" → 1234.5
 */
export function parseUaMoney(
  input: string,
  locale: LocaleSettings,
): ParseResult {
  const s = normalizeInput(input)
    .replace(/₴/g, '')
    .replace(/грн/gi, '')
    .trim();
  if (!s) return { ok: true, value: 0 };
  const n = parseLocaleNumber(s, locale);
  if (n == null || !Number.isFinite(n)) return { ok: false, reason: 'Невірна сума' };
  return { ok: true, value: n };
}

/**
 * Parse UA percent. Standard: store value in percent (12.5 for 12.5%).
 * "12,5%" → 12.5, "12.5" (no %) → 12.5
 */
export function parseUaPercent(
  input: string,
  locale: LocaleSettings,
): ParseResult {
  const s = normalizeInput(input);
  if (!s) return { ok: true, value: 0 };
  let withoutPercent = s.replace(/%/g, '').trim();
  if (!withoutPercent) return { ok: false, reason: 'Невірний відсоток' };
  const n = parseLocaleNumber(withoutPercent, locale);
  if (n == null || !Number.isFinite(n)) return { ok: false, reason: 'Невірний відсоток' };
  return { ok: true, value: n };
}
