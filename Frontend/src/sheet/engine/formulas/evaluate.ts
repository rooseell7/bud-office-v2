/**
 * Formula evaluator. Canonical sheet: src/sheet/**
 */

import type { LocaleSettings } from '../../configs/types';
import { defaultLocale } from '../../configs/types';
import { parseLocaleNumber } from '../number/parseNumber';
import type { FormulaAST } from './parse';

const CYCLE = '#CYCLE!';
const NAME_ERR = '#NAME?';

function toNum(v: string | number, locale: LocaleSettings): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === CYCLE || v === NAME_ERR) return 0;
  const n = parseLocaleNumber(String(v), locale);
  return n != null ? n : 0;
}

function collectRangeNumbers(
  r1: number, c1: number, r2: number, c2: number,
  getCellValue: (row: number, col: number) => string | number,
  locale: LocaleSettings,
): number[] {
  const nums: number[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const v = getCellValue(r, c);
      if (v !== CYCLE) nums.push(toNum(v, locale));
    }
  }
  return nums;
}

function evalRange(
  r1: number, c1: number, r2: number, c2: number,
  getCellValue: (row: number, col: number) => string | number,
  locale: LocaleSettings,
): number {
  return collectRangeNumbers(r1, c1, r2, c2, getCellValue, locale).reduce((a, b) => a + b, 0);
}

function evalFn(
  name: string,
  args: FormulaAST[],
  getCellValue: (row: number, col: number) => string | number,
  locale: LocaleSettings,
): string | number {
  const n = (i: number) => {
    const v = evaluateFormula(args[i], getCellValue, locale);
    return typeof v === 'number' ? v : toNum(v, locale);
  };
  const v = (i: number) => evaluateFormula(args[i], getCellValue, locale);

  switch (name) {
    case 'SUM': {
      let sum = 0;
      for (const a of args) {
        if (a.type === 'range') {
          sum += evalRange(a.r1, a.c1, a.r2, a.c2, getCellValue, locale);
        } else {
          sum += toNum(evaluateFormula(a, getCellValue, locale) as string | number, locale);
        }
      }
      return sum;
    }
    case 'ROUND':
      if (args.length >= 1) {
        const x = toNum(evaluateFormula(args[0], getCellValue, locale) as string | number, locale);
        const decimals = args.length >= 2 ? Math.round(n(1)) : 0;
        return Math.round(x * Math.pow(10, decimals)) / Math.pow(10, decimals);
      }
      return 0;
    case 'IF':
      if (args.length >= 2) {
        const cond = v(0);
        const c = typeof cond === 'number' ? cond : toNum(cond, locale);
        const truthy = c !== 0 && !Number.isNaN(c) && String(cond).toUpperCase() !== 'FALSE';
        return truthy
          ? (args[1] ? evaluateFormula(args[1], getCellValue, locale) : 0)
          : (args[2] ? evaluateFormula(args[2], getCellValue, locale) : '');
      }
      return '';
    case 'AVG':
    case 'AVERAGE': {
      const nums: number[] = [];
      for (const a of args) {
        if (a.type === 'range') {
          nums.push(...collectRangeNumbers(a.r1, a.c1, a.r2, a.c2, getCellValue, locale));
        } else {
          nums.push(toNum(evaluateFormula(a, getCellValue, locale) as string | number, locale));
        }
      }
      if (nums.length === 0) return 0;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    case 'MIN': {
      const minNums: number[] = [];
      for (const a of args) {
        if (a.type === 'range') {
          minNums.push(...collectRangeNumbers(a.r1, a.c1, a.r2, a.c2, getCellValue, locale));
        } else {
          minNums.push(toNum(evaluateFormula(a, getCellValue, locale) as string | number, locale));
        }
      }
      return minNums.length === 0 ? 0 : Math.min(...minNums);
    }
    case 'MAX': {
      const maxNums: number[] = [];
      for (const a of args) {
        if (a.type === 'range') {
          maxNums.push(...collectRangeNumbers(a.r1, a.c1, a.r2, a.c2, getCellValue, locale));
        } else {
          maxNums.push(toNum(evaluateFormula(a, getCellValue, locale) as string | number, locale));
        }
      }
      return maxNums.length === 0 ? 0 : Math.max(...maxNums);
    }
    default:
      return NAME_ERR;
  }
}

export function evaluateFormula(
  ast: FormulaAST,
  getCellValue: (row: number, col: number) => string | number,
  locale: LocaleSettings = defaultLocale,
): string | number {
  if (ast.type === 'ref') {
    const v = getCellValue(ast.row, ast.col);
    if (v === CYCLE) return CYCLE;
    if (v === NAME_ERR) return NAME_ERR;
    const num = toNum(v, locale);
    return num;
  }
  if (ast.type === 'range') {
    return evalRange(ast.r1, ast.c1, ast.r2, ast.c2, getCellValue, locale);
  }
  if (ast.type === 'num') return ast.value;
  if (ast.type === 'fn') return evalFn(ast.name, ast.args, getCellValue, locale);
  if (ast.type === 'op') {
    const l = evaluateFormula(ast.left, getCellValue, locale);
    const r = evaluateFormula(ast.right, getCellValue, locale);
    if (l === CYCLE || r === CYCLE) return CYCLE;
    if (l === NAME_ERR || r === NAME_ERR) return NAME_ERR;
    const ln = toNum(l as string | number, locale);
    const rn = toNum(r as string | number, locale);
    switch (ast.op) {
      case '+': return ln + rn;
      case '-': return ln - rn;
      case '*': return ln * rn;
      case '/': return rn === 0 ? '#DIV/0!' : ln / rn;
      case '>': return ln > rn ? 1 : 0;
      case '<': return ln < rn ? 1 : 0;
      case '>=': return ln >= rn ? 1 : 0;
      case '<=': return ln <= rn ? 1 : 0;
      case '=': return Math.abs(ln - rn) < 1e-10 ? 1 : 0;
      case '<>': return Math.abs(ln - rn) >= 1e-10 ? 1 : 0;
      default: return 0;
    }
  }
  return 0;
}
