/**
 * Formula parser. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { defaultLocale } from '../../configs/types';
import { parseLocaleNumber } from '../number/parseNumber';

export type FormulaAST =
  | { type: 'ref'; row: number; col: number }
  | { type: 'range'; r1: number; c1: number; r2: number; c2: number }
  | { type: 'num'; value: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '=' | '<>'; left: FormulaAST; right: FormulaAST }
  | { type: 'fn'; name: string; args: FormulaAST[] };

export function isFormula(raw: string): boolean {
  return (raw || '').trimStart().startsWith('=');
}

/** Parse A1-style ref (1-based row) to 0-based row,col */
function parseRef(s: string): { row: number; col: number } | null {
  const m = /^([A-Z]+)([1-9]\d*)$/i.exec((s || '').trim());
  if (!m) return null;
  const colStr = m[1];
  const rowStr = m[2];
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    const c = colStr.toUpperCase().charCodeAt(i) - 64;
    if (c < 1 || c > 26) return null;
    col = col * 26 + c;
  }
  const row = parseInt(rowStr, 10) - 1;
  return { row, col: col - 1 };
}

/** Detect arg separator from formula: if ; present use ;, else , */
function detectArgSeparator(formula: string, locale: LocaleSettings): ';' | ',' {
  if ((formula || '').includes(';')) return ';';
  return locale.argSeparator;
}

/** Tokenizer: refs, numbers (with comma), ops, parens, ; , : */
function tokenize(formula: string, locale: LocaleSettings): string[] {
  const s = (formula || '').replace(/\s+/g, ' ').trim();
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '=' || s[i] === ' ') {
      i++;
      continue;
    }
    if (/[+\-*/();,:<>]/.test(s[i])) {
      if ((s[i] === '>' || s[i] === '<') && (s[i + 1] === '=' || s[i + 1] === '>')) {
        tokens.push(s[i] + s[i + 1]);
        i += 2;
        continue;
      }
      tokens.push(s[i]);
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(s[i])) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      let k = j;
      while (k < s.length && /[0-9]/.test(s[k])) k++;
      tokens.push(s.slice(i, k));
      i = k;
      continue;
    }
    if (/[0-9.,]/.test(s[i])) {
      let j = i;
      while (j < s.length && /[0-9.,\s]/.test(s[j])) j++;
      const raw = s.slice(i, j).replace(/\s/g, '');
      if (raw) tokens.push(raw);
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

const PREC: Record<string, number> = {
  '+': 1, '-': 1, '>': 2, '<': 2, '>=': 2, '<=': 2, '=': 2, '<>': 2,
  '*': 3, '/': 3,
};

function parseNumToken(t: string, locale: LocaleSettings): number | null {
  const n = parseLocaleNumber(t, locale);
  if (n != null) return n;
  const dot = parseFloat(t);
  return Number.isFinite(dot) ? dot : null;
}

function parsePrimary(
  tokens: string[],
  pos: { i: number },
  locale: LocaleSettings,
  argSep: ';' | ',',
): FormulaAST | null {
  if (pos.i >= tokens.length) return null;
  const t = tokens[pos.i];
  if (t === '(') {
    pos.i++;
    const inner = parseExpr(tokens, pos, 0, locale, argSep);
    if (tokens[pos.i] === ')') pos.i++;
    return inner;
  }
  if (/^[A-Z]+\d+$/i.test(t)) {
    const ref = parseRef(t);
    pos.i++;
    if (!ref) return null;
    if (tokens[pos.i] === ':') {
      pos.i++;
      const t2 = tokens[pos.i];
      if (!t2 || !/^[A-Z]+\d+$/i.test(t2)) return { type: 'ref', ...ref };
      const ref2 = parseRef(t2);
      pos.i++;
      if (!ref2) return { type: 'ref', ...ref };
      return {
        type: 'range',
        r1: Math.min(ref.row, ref2.row),
        c1: Math.min(ref.col, ref2.col),
        r2: Math.max(ref.row, ref2.row),
        c2: Math.max(ref.col, ref2.col),
      };
    }
    return { type: 'ref', ...ref };
  }
  if (/^[\d.,\s]+$/.test(t)) {
    const val = parseNumToken(t, locale);
    pos.i++;
    if (val != null) return { type: 'num', value: val };
    return null;
  }
  if (/^[A-Z_][A-Z0-9_]*$/i.test(t) && tokens[pos.i + 1] === '(') {
    const name = t.toUpperCase();
    pos.i += 2;
    const args: FormulaAST[] = [];
    while (pos.i < tokens.length && tokens[pos.i] !== ')') {
      const arg = parseExpr(tokens, pos, 0, locale, argSep);
      if (!arg) break;
      args.push(arg);
      if (tokens[pos.i] === argSep) pos.i++;
    }
    if (tokens[pos.i] === ')') pos.i++;
    return { type: 'fn', name, args };
  }
  return null;
}

function parseExpr(
  tokens: string[],
  pos: { i: number },
  minPrec: number,
  locale: LocaleSettings,
  argSep: ';' | ',',
): FormulaAST | null {
  let left = parsePrimary(tokens, pos, locale, argSep);
  if (!left) return null;

  while (pos.i < tokens.length) {
    const t = tokens[pos.i];
    const op = t as keyof typeof PREC;
    if (!(op in PREC)) break;
    const prec = PREC[op] ?? 0;
    if (prec < minPrec) break;
    pos.i++;
    const right = parseExpr(tokens, pos, prec + 1, locale, argSep);
    if (!right) return left;
    left = { type: 'op', op: op as any, left, right };
  }
  return left;
}

export function parseFormula(formula: string, locale: LocaleSettings = defaultLocale): FormulaAST | null {
  const trimmed = (formula || '').trim();
  if (!trimmed.startsWith('=')) return null;
  const argSep = detectArgSeparator(trimmed, locale);
  const tokens = tokenize(trimmed, locale);
  const pos = { i: 0 };
  return parseExpr(tokens, pos, 0, locale, argSep);
}
