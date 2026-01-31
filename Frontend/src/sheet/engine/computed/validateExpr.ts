/**
 * Validate computed expression. Canonical sheet: src/sheet/**
 */

import type { SheetColumn } from '../types';
import { parseExpr, extractRefsFromAST, isAllowedFunction } from './exprParser';

export type ValidateResult = { ok: true } | { ok: false; message: string };

/**
 * Validate expr: syntax, keys exist, functions allowed.
 */
export function validateExpr(
  expr: string,
  columns: SheetColumn[],
): ValidateResult {
  const s = (expr || '').trim();
  if (!s) return { ok: true };

  try {
    const ast = parseExpr(s);
    const keyToCol = new Map<string, number>();
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      if (col?.key) keyToCol.set(col.key, c);
    }
    keyToCol.set('_row', -1);

    const refs = extractRefsFromAST(ast);
    for (const key of refs) {
      if (!keyToCol.has(key)) {
        return { ok: false, message: `Невідомий ключ: {${key}}` };
      }
    }

    function checkFuncs(node: import('./exprParser').AST): ValidateResult {
      if (node.type === 'func') {
        if (!isAllowedFunction(node.name)) {
          return { ok: false, message: `Невідома функція: ${node.name}` };
        }
        const name = node.name.toUpperCase();
        if (name === 'ROW' && node.args.length !== 0) {
          return { ok: false, message: 'ROW() не приймає аргументів' };
        }
        if (name === 'COL' && node.args.length > 1) {
          return { ok: false, message: 'COL() приймає 0 або 1 аргумент' };
        }
        if (['SUMCOL', 'MINCOL', 'MAXCOL', 'AVGCOL', 'COUNTCOL'].includes(name)) {
          if (node.args.length !== 1 && node.args.length !== 3) {
            return { ok: false, message: `${name} приймає 1 або 3 аргументи` };
          }
          const first = node.args[0];
          if (!first || first.type !== 'ref') {
            return { ok: false, message: `${name}: перший аргумент має бути {key}` };
          }
          if (!keyToCol.has(first.key)) {
            return { ok: false, message: `Невідомий ключ: {${first.key}}` };
          }
        }
        for (const arg of node.args) {
          const r = checkFuncs(arg);
          if (!r.ok) return r;
        }
      } else if (node.type === 'binary' || node.type === 'compare') {
        const l = checkFuncs(node.left);
        if (!l.ok) return l;
        return checkFuncs(node.right);
      }
      return { ok: true };
    }
    return checkFuncs(ast);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
