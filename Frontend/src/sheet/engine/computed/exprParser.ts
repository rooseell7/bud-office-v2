/**
 * Safe expression parser for computed columns. No eval(). Canonical sheet: src/sheet/**
 */

import { getCached, setCached } from './aggregateCache';

const COMPARE_OPS = new Set(['>', '<', '>=', '<=', '==', '!=']);

export type EvalContext = {
  rowIndex: number;
  colIndex: number;
  rowCount: number;
  version: number;
  keyToCol: Map<string, number>;
  getCellNumeric: (row: number, colKey: string) => number;
  isCellNonEmpty: (row: number, colKey: string) => boolean;
};

/** AST node types */
export type AST =
  | { type: 'number'; value: number }
  | { type: 'ref'; key: string }
  | { type: 'binary'; op: string; left: AST; right: AST }
  | { type: 'compare'; op: string; left: AST; right: AST }
  | { type: 'func'; name: string; args: AST[] };

type Token =
  | { type: 'number'; value: number }
  | { type: 'ref'; key: string }
  | { type: 'op'; op: string }
  | { type: 'ident'; name: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

function tokenize(expr: string): Token[] {
  const s = (expr || '').trim();
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    if (c === '>' && s[i + 1] === '=') {
      tokens.push({ type: 'op', op: '>=' });
      i += 2;
      continue;
    }
    if (c === '<' && s[i + 1] === '=') {
      tokens.push({ type: 'op', op: '<=' });
      i += 2;
      continue;
    }
    if (c === '=' && s[i + 1] === '=') {
      tokens.push({ type: 'op', op: '==' });
      i += 2;
      continue;
    }
    if (c === '!' && s[i + 1] === '=') {
      tokens.push({ type: 'op', op: '!=' });
      i += 2;
      continue;
    }
    if (c === '>' || c === '<') {
      tokens.push({ type: 'op', op: c });
      i++;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/') {
      tokens.push({ type: 'op', op: c });
      i++;
      continue;
    }
    if (c === '{') {
      const end = s.indexOf('}', i);
      if (end === -1) throw new Error('Unclosed {ref}');
      const key = s.slice(i + 1, end).trim();
      if (!key) throw new Error('Empty {ref}');
      tokens.push({ type: 'ref', key });
      i = end + 1;
      continue;
    }
    if (/[\d.,\s]/.test(c)) {
      let num = '';
      while (i < s.length && /[\d.,\s]/.test(s[i])) {
        num += s[i];
        i++;
      }
      const normalized = num.replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(normalized);
      if (!Number.isFinite(n)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value: n });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let name = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        name += s[i];
        i++;
      }
      tokens.push({ type: 'ident', name: name.toUpperCase() });
      continue;
    }
    throw new Error(`Unexpected character: ${c}`);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(expr: string) {
    this.tokens = tokenize(expr);
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): AST {
    const ast = this.parseExpr();
    if (this.peek()) throw new Error('Unexpected token');
    return ast;
  }

  private parseExpr(): AST {
    return this.parseComparison();
  }

  private parseComparison(): AST {
    let left = this.parseAdd();
    for (;;) {
      const t = this.peek();
      if (t?.type === 'op' && COMPARE_OPS.has(t.op)) {
        this.consume();
        const right = this.parseAdd();
        left = { type: 'compare', op: t.op, left, right };
      } else break;
    }
    return left;
  }

  private parseAdd(): AST {
    let left = this.parseMul();
    for (;;) {
      const t = this.peek();
      if (t?.type === 'op' && (t.op === '+' || t.op === '-')) {
        this.consume();
        const right = this.parseMul();
        left = { type: 'binary', op: t.op, left, right };
      } else break;
    }
    return left;
  }

  private parseMul(): AST {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.type === 'op' && (t.op === '*' || t.op === '/')) {
        this.consume();
        const right = this.parseUnary();
        left = { type: 'binary', op: t.op, left, right };
      } else break;
    }
    return left;
  }

  private parseUnary(): AST {
    const t = this.peek();
    if (t?.type === 'op' && (t.op === '-' || t.op === '+')) {
      this.consume();
      const inner = this.parseUnary();
      if (t.op === '-') {
        return { type: 'binary', op: '*', left: { type: 'number', value: -1 }, right: inner };
      }
      return inner;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AST {
    const t = this.consume();
    if (!t) throw new Error('Unexpected end');

    if (t.type === 'number') return { type: 'number', value: t.value };
    if (t.type === 'ref') return { type: 'ref', key: t.key };

    if (t.type === 'ident') {
      if (this.peek()?.type !== 'lparen') throw new Error(`Unknown identifier: ${t.name}`);
      this.consume();
      const args = this.parseArgs();
      if (this.consume()?.type !== 'rparen') throw new Error('Missing )');
      return { type: 'func', name: t.name, args };
    }

    if (t.type === 'lparen') {
      const inner = this.parseExpr();
      if (this.consume()?.type !== 'rparen') throw new Error('Missing )');
      return inner;
    }

    throw new Error('Unexpected token');
  }

  private parseArgs(): AST[] {
    const args: AST[] = [];
    if (this.peek()?.type === 'rparen') return args;
    args.push(this.parseExpr());
    while (this.peek()?.type === 'comma') {
      this.consume();
      args.push(this.parseExpr());
    }
    return args;
  }
}

function toNum(v: number | null): number {
  return v != null && Number.isFinite(v) ? v : 0;
}

function evalCompare(op: string, a: number, b: number): number {
  const x = toNum(a);
  const y = toNum(b);
  let ok = false;
  switch (op) {
    case '>': ok = x > y; break;
    case '<': ok = x < y; break;
    case '>=': ok = x >= y; break;
    case '<=': ok = x <= y; break;
    case '==': ok = x === y; break;
    case '!=': ok = x !== y; break;
    default: return 0;
  }
  return ok ? 1 : 0;
}

const FUNCTIONS: Record<string, (args: number[]) => number | null> = {
  SUM: (args) => {
    let s = 0;
    for (const a of args) s += Number.isFinite(a) ? a : 0;
    return s;
  },
  MIN: (args) => {
    if (args.length === 0) return 0;
    let m = Infinity;
    for (const a of args) {
      const n = Number.isFinite(a) ? a : 0;
      if (n < m) m = n;
    }
    return m === Infinity ? 0 : m;
  },
  MAX: (args) => {
    if (args.length === 0) return 0;
    let m = -Infinity;
    for (const a of args) {
      const n = Number.isFinite(a) ? a : 0;
      if (n > m) m = n;
    }
    return m === -Infinity ? 0 : m;
  },
  ROUND: (args) => {
    if (args.length < 1) return null;
    const x = Number.isFinite(args[0]) ? args[0] : 0;
    const decimals = args.length >= 2 && Number.isFinite(args[1]) ? Math.round(args[1]) : 0;
    const factor = Math.pow(10, Math.max(0, Math.min(20, decimals)));
    return Math.round(x * factor) / factor;
  },
  IF: (args) => {
    if (args.length !== 3) return null;
    const cond = args[0];
    const a = Number.isFinite(args[1]) ? args[1] : 0;
    const b = Number.isFinite(args[2]) ? args[2] : 0;
    return cond !== 0 ? a : b;
  },
  AND: (args) => {
    for (const a of args) {
      const n = Number.isFinite(a) ? a : 0;
      if (n === 0) return 0;
    }
    return 1;
  },
  OR: (args) => {
    for (const a of args) {
      const n = Number.isFinite(a) ? a : 0;
      if (n !== 0) return 1;
    }
    return 0;
  },
  NOT: (args) => {
    if (args.length !== 1) return null;
    const n = Number.isFinite(args[0]) ? args[0] : 0;
    return n === 0 ? 1 : 0;
  },
};

const AGGREGATE_FUNCTIONS = new Set([
  'SUMCOL', 'MINCOL', 'MAXCOL', 'AVGCOL', 'COUNTCOL',
]);

const CONTEXT_FUNCTIONS = new Set(['ROW', 'COL']);

const ALLOWED_FUNCTIONS = new Set([
  ...Object.keys(FUNCTIONS),
  ...AGGREGATE_FUNCTIONS,
  ...CONTEXT_FUNCTIONS,
]);

export function isAllowedFunction(name: string): boolean {
  return ALLOWED_FUNCTIONS.has(name.toUpperCase());
}

export function parseExpr(expr: string): AST {
  const s = (expr || '').trim();
  if (!s) throw new Error('Empty expression');
  return new Parser(s).parse();
}

function runAggregate(
  name: string,
  colKey: string,
  startRow: number,
  endRow: number,
  ctx: EvalContext,
): number | null {
  const { getCellNumeric, isCellNonEmpty, rowCount, version } = ctx;
  const s = Math.max(1, Math.min(startRow, rowCount));
  const e = Math.min(rowCount, Math.max(1, endRow));
  if (s > e) return 0;

  const cached = getCached(name, colKey, s, e, version);
  if (cached !== undefined) return cached;

  let result: number;
  if (name === 'SUMCOL') {
    let sum = 0;
    for (let r = s - 1; r < e; r++) {
      sum += getCellNumeric(r, colKey);
    }
    result = sum;
  } else if (name === 'MINCOL') {
    let m = Infinity;
    for (let r = s - 1; r < e; r++) {
      const v = getCellNumeric(r, colKey);
      if (Number.isFinite(v) && v < m) m = v;
    }
    result = m === Infinity ? 0 : m;
  } else if (name === 'MAXCOL') {
    let m = -Infinity;
    for (let r = s - 1; r < e; r++) {
      const v = getCellNumeric(r, colKey);
      if (Number.isFinite(v) && v > m) m = v;
    }
    result = m === -Infinity ? 0 : m;
  } else if (name === 'COUNTCOL') {
    let cnt = 0;
    for (let r = s - 1; r < e; r++) {
      if (isCellNonEmpty(r, colKey)) cnt++;
    }
    result = cnt;
  } else if (name === 'AVGCOL') {
    let sum = 0;
    let cnt = 0;
    for (let r = s - 1; r < e; r++) {
      if (isCellNonEmpty(r, colKey)) {
        sum += getCellNumeric(r, colKey);
        cnt++;
      }
    }
    result = cnt === 0 ? 0 : sum / cnt;
  } else {
    return null;
  }

  setCached(name, colKey, s, e, version, result);
  return result;
}

function evalAST(
  ast: AST,
  getRef: (key: string) => number,
  ctx?: EvalContext,
): number | null {
  switch (ast.type) {
    case 'number':
      return ast.value;
    case 'ref': {
      const v = getRef(ast.key);
      return Number.isFinite(v) ? v : 0;
    }
    case 'binary': {
      const a = evalAST(ast.left, getRef, ctx);
      const b = evalAST(ast.right, getRef, ctx);
      if (a == null || b == null) return null;
      switch (ast.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? null : a / b;
        default: return null;
      }
    }
    case 'compare': {
      const a = evalAST(ast.left, getRef, ctx);
      const b = evalAST(ast.right, getRef, ctx);
      if (a == null || b == null) return null;
      return evalCompare(ast.op, a, b);
    }
    case 'func': {
      const name = ast.name.toUpperCase();
      if (CONTEXT_FUNCTIONS.has(name) && ctx) {
        if (name === 'ROW') return ast.args.length === 0 ? ctx.rowIndex + 1 : null;
        if (name === 'COL') {
          if (ast.args.length === 0) return ctx.colIndex + 1;
          if (ast.args.length === 1 && ast.args[0].type === 'ref') {
            const col = ctx.keyToCol.get(ast.args[0].key);
            return col != null ? col + 1 : 0;
          }
          return null;
        }
      }
      if (AGGREGATE_FUNCTIONS.has(name) && ctx) {
        const first = ast.args[0];
        if (!first || first.type !== 'ref') return null;
        const colKey = first.key;
        if (!ctx.keyToCol.has(colKey)) return 0;
        let startRow = 1;
        let endRow = ctx.rowCount;
        if (ast.args.length >= 3) {
          const s = evalAST(ast.args[1], getRef, ctx);
          const e = evalAST(ast.args[2], getRef, ctx);
          if (s == null || e == null) return null;
          startRow = Math.round(s);
          endRow = Math.round(e);
        }
        return runAggregate(name, colKey, startRow, endRow, ctx);
      }
      const fn = FUNCTIONS[name];
      if (!fn) return null;
      const args: number[] = [];
      for (const arg of ast.args) {
        const v = evalAST(arg, getRef, ctx);
        if (v == null) return null;
        args.push(v);
      }
      return fn(args);
    }
  }
}

/**
 * Parse and evaluate expression. Returns number or null on error.
 * getRef(key) returns numeric value for {key} (0 for invalid/missing).
 * ctx optional for ROW/COL and aggregate functions.
 * #ERR only for: syntax error, division by zero, unknown function, IF wrong args.
 */
export function evaluateExpr(
  expr: string,
  getRef: (key: string) => number,
  ctx?: EvalContext,
): number | null {
  try {
    const ast = parseExpr(expr);
    const result = evalAST(ast, getRef, ctx);
    return result != null && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Extract all {key} refs from expression AST.
 */
export function extractRefsFromAST(ast: AST): string[] {
  const refs: string[] = [];
  function visit(n: AST) {
    if (n.type === 'ref') refs.push(n.key);
    else if (n.type === 'binary' || n.type === 'compare') {
      visit(n.left);
      visit(n.right);
    } else if (n.type === 'func') {
      for (const a of n.args) visit(a);
    }
  }
  visit(ast);
  return refs;
}
