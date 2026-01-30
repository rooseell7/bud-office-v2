/**
 * Clipboard parse. Canonical sheet: src/sheet/**
 */

/** \r\n → \n, \r → \n */
export function normalizeLineBreaks(text: string): string {
  return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Split by \n, remove trailing empty if technical (single \n at end) */
export function splitRows(text: string): string[] {
  const normalized = normalizeLineBreaks(text);
  const rows = normalized.split('\n');
  if (rows.length > 1 && rows[rows.length - 1] === '') {
    rows.pop();
  }
  return rows;
}

function countCols(rowText: string, delimiter: string): number {
  if (!rowText) return 0;
  if (!delimiter) return 1;
  return rowText.split(delimiter).length;
}

/**
 * Detect delimiter from first row:
 * \t first, else ; if >=2 cols, else , if >=2, else \t
 */
export function detectDelimiter(rowText: string): '\t' | ';' | ',' {
  if (!rowText) return '\t';
  if (rowText.includes('\t')) return '\t';
  const semiCols = countCols(rowText, ';');
  if (rowText.includes(';') && semiCols >= 2) return ';';
  const commaCols = countCols(rowText, ',');
  if (rowText.includes(',') && commaCols >= 2) return ',';
  return '\t';
}

/** Split row by delimiter (no regex) */
export function splitCols(rowText: string, delimiter: string): string[] {
  if (!delimiter) return [rowText ?? ''];
  return (rowText ?? '').split(delimiter);
}

/** Parse pasted text into raw string[][] matrix */
export function parsePastedText(text: string): string[][] {
  const rows = splitRows(text);
  if (rows.length === 0) return [];

  const firstRow = rows[0];
  const delimiter = detectDelimiter(firstRow);

  return rows.map((row) => {
    const cells = splitCols(row, delimiter);
    return cells.map((c) => c.replace(/\r$/, '').trimEnd());
  });
}
