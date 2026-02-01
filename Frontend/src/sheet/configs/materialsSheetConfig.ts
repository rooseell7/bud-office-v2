/**
 * Матеріали — таблиця етапу КП
 */

import type { SheetConfig } from './types';
import { uaLocale } from './types';

export const materialsSheetColumnHeaders = [
  '№',
  'Найменування матеріалу',
  'Од. вимір',
  'К-ть',
  'Ціна за од.',
  'Сума',
  'Собівартість одиниці',
  'Загалом собівартість',
  'Постачальник / Примітка',
] as const;

export const M_COL = {
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

export const materialsSheetConfig: Partial<SheetConfig> = {
  rowCount: 100,
  colCount: materialsSheetColumnHeaders.length,
  locale: uaLocale,
  columnHeaders: [...materialsSheetColumnHeaders],
  columnKeys: ['num', 'name', 'unit', 'qty', 'price', 'total', 'costUnit', 'costTotal', 'note'],
  columnFormats: ['text', 'text', 'text', 'number', 'uah', 'uah', 'uah', 'uah', 'text'],
  readonlyColumns: [M_COL.NUM, M_COL.TOTAL, M_COL.COST_TOTAL],
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
  flexColumn: M_COL.NAME,
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
