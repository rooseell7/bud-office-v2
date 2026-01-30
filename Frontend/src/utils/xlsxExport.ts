import * as XLSX from 'xlsx';

import { parseNumber } from '../modules/shared/sheet/utils';

type Cell = string | number | boolean | null | undefined;

function asNum(v: unknown): number {
  return parseNumber(v, 0);
}

function safeFilePart(v: string): string {
  return String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 60);
}

export function exportInvoiceXlsx(args: {
  fileNameBase: string;
  headerRows: Cell[][];
  tableHeader: Cell[];
  tableRows: Cell[][];
  footerRows?: Cell[][];
}): void {
  const { fileNameBase, headerRows, tableHeader, tableRows, footerRows } = args;

  const aoa: Cell[][] = [];
  aoa.push(...headerRows);
  aoa.push([]);
  aoa.push(tableHeader);
  aoa.push(...tableRows);
  if (footerRows?.length) {
    aoa.push([]);
    aoa.push(...footerRows);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Просте форматування чисел для сум/цін (якщо це числа)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; R += 1) {
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (!cell) continue;
      if (typeof cell.v === 'string') {
        // якщо строка виглядає як число — переводимо у number
        const num = asNum(cell.v);
        if (String(cell.v).trim() !== '' && Number.isFinite(num) && /\d/.test(String(cell.v))) {
          // лишаємо як string для найменування (великі колонки), тому обмежимо перетворення
          if (/^\s*[+-]?\d+[\d\s]*([\.,]\d+)?\s*$/.test(String(cell.v))) {
            cell.t = 'n';
            cell.v = num;
            cell.z = '0.00';
          }
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

  const fn = `${safeFilePart(fileNameBase)}.xlsx`;
  XLSX.writeFile(wb, fn, { compression: true });
}
