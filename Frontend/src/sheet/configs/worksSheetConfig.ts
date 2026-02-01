/**
 * Роботи — таблиця етапу КП
 * TABLE CORE: DO NOT CHANGE WITHOUT EXPLICIT TASK (Nazar)
 */

import type { SheetConfig } from './types';
import { uaLocale } from './types';

export const worksSheetColumnHeaders = [
  '№',
  'Найменування робіт',
  'Од. вимір',
  'К-ть',
  'Ціна за од.',
  'Сума',
  'Собівартість одиниці',
  'Загалом собівартість',
  'Примітки',
] as const;

export const W_COL = {
  NUM: 0,
  NAME: 1,
  UNIT: 2,
  QTY: 3,
  PRICE: 4,
  TOTAL: 5,
  COST_UNIT: 6,
  COST_TOTAL: 7,
  NOTE: 8,
} as const;

export const worksSheetConfig: Partial<SheetConfig> = {
  rowCount: 20,
  colCount: worksSheetColumnHeaders.length,
  locale: uaLocale,
  columnHeaders: [...worksSheetColumnHeaders],
  columnKeys: ['num', 'name', 'unit', 'qty', 'price', 'total', 'costUnit', 'costTotal', 'note'],
  columnFormats: ['text', 'text', 'text', 'number', 'uah', 'uah', 'uah', 'uah', 'text'],
  readonlyColumns: [W_COL.NUM, W_COL.TOTAL, W_COL.COST_TOTAL],
  columnComputeds: [
    { expr: '{_row}' },
    undefined,
    undefined,
    undefined,
    undefined,
    { expr: '{qty} * {price}' },
    undefined,
    { expr: '{qty} * {costUnit}' },
    undefined,
  ],
  flexColumn: W_COL.NAME,
  columnWidthDefaults: [48, 360, 90, 90, 120, 130, 120, 130, 180],
  columnWrap: [false, true, false, false, false, false, false, false, true],
  allowColumnInsert: true,
  allowColumnDelete: true,
  allowColumnRename: true,
  allowRowInsert: true,
  allowRowDelete: true,
  minColumns: 1,
  minRows: 1,
  protectedColumnIds: ['col-0'],
  allowDeleteMultiple: true,
  confirmDangerousOperations: true,
};
