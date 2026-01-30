/**
 * Shared "sheet" utilities.
 *
 * IMPORTANT: Keep these helpers framework-agnostic and side-effect free.
 */

/**
 * Генератор ідентифікаторів для UI (етапи/рядки/шаблони).
 * Не пов'язаний з БД.
 */
export function uid(prefix = 'id'): string {
  // crypto.randomUUID() є не всюди, тому залишаємо стабільний fallback.
  const rnd = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rnd}`;
}

export function n(v: unknown, fallback = 0): number {
  return parseNumber(v, fallback);
}

export function f2(v: unknown): string {
  return formatFixed(v, 2);
}

export function cleanNumInput(s: string): string {
  // NBSP -> space, trim, drop whitespaces, unify decimal separator.
  // Also remove common thousands separators (apostrophe/underscore).
  return String(s ?? '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/[\s'_]/g, '')
    .replace(/,/g, '.');
}

/**
 * Єдиний “толерантний” парсер чисел для всіх табличних модулів (КП/Акти/Накладні).
 * Підтримує: пробіли/nbsp, кома або крапка, апострофи як розділювач тисяч,
 * значення з %, та формат (123) як від’ємне.
 */
export function parseNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (v === null || v === undefined) return fallback;

  let s = String(v).trim();
  if (!s) return fallback;

  // (123.45) -> -123.45
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  // strip percent sign and non-numeric decorations (currency, units)
  s = s.replace(/%/g, '');
  s = s.replace(/[^0-9+\-.,\s\u00A0'_]/g, '');

  // unify separators
  s = cleanNumInput(s);
  if (!s) return fallback;

  // allow only one leading sign
  s = s.replace(/(?!^)[+-]/g, '');

  // keep only first dot as decimal separator
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    const head = s.slice(0, firstDot + 1);
    const tail = s
      .slice(firstDot + 1)
      .replace(/\./g, '');
    s = head + tail;
  }

  const num = Number(s);
  if (!Number.isFinite(num)) return fallback;
  return negative ? -num : num;
}

export function formatFixed(v: unknown, decimals = 2, fallback = 0): string {
  const num = parseNumber(v, fallback);
  const p = 10 ** Math.max(0, Math.min(8, decimals));
  const rounded = Math.round(num * p) / p;
  return rounded.toFixed(decimals);
}

export function f3(v: unknown): string {
  return formatFixed(v, 3);
}

export function parseClipboardMatrix(text: string): string[][] {
  const raw = String(text ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  let lines = raw.split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  while (lines.length && lines[0] === '') lines.shift();
  return lines.map((l) => l.split('\t'));
}

export function normKey(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
