/**
 * Quote (КП) sheet config. Canonical sheet: src/sheet/**
 */

import type { SheetConfig } from './types';
import { uaLocale } from './types';

export const quoteSheetColumnHeaders = [
  '№',
  'Найменування',
  'Од. вимір',
  'Кіл-ть',
  'Ціна зо од.',
  'Загальна',
  'Собівартість одиниці',
  'Загалом собівартість',
] as const;

/** Column indices */
export const Q_COL = {
  NUM: 0,
  NAME: 1,
  UNIT: 2,
  QTY: 3,
  PRICE: 4,
  TOTAL: 5,
  COST_UNIT: 6,
  COST_TOTAL: 7,
} as const;

/** Stable keys for computed refs */
export const quoteColumnKeys = [
  'num',
  'name',
  'unit',
  'qty',
  'price',
  'total',
  'costUnit',
  'costTotal',
] as const;

export const quoteSheetConfig: Partial<SheetConfig> = {
  rowCount: 100,
  colCount: quoteSheetColumnHeaders.length,
  locale: uaLocale,
  columnHeaders: [...quoteSheetColumnHeaders],
  columnKeys: [...quoteColumnKeys],
  columnFormats: [
    'text',   // №
    'text',   // Найменування
    'text',   // Од. вимір
    'number', // Кіл-ть
    'uah',    // Ціна зо од.
    'uah',    // Загальна (computed)
    'uah',    // Собівартість одиниці
    'uah',    // Загалом собівартість (computed)
  ],
  readonlyColumns: [Q_COL.NUM, Q_COL.TOTAL, Q_COL.COST_TOTAL],
  columnComputeds: [
    { expr: '{_row}' },           // № = row + 1
    undefined,
    undefined,
    undefined,
    undefined,
    { expr: '{qty} * {price}' },  // Загальна
    undefined,
    { expr: '{qty} * {costUnit}' }, // Загалом собівартість
  ],
  flexColumn: Q_COL.NAME,
  columnWidthDefaults: [360, 90, 90, 120, 130, 150, 160, 120],
  columnWrap: [false, true, false, false, false, false, false, false],
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
  allowColumnFormulaEdit: true,
  allowSort: true,
  allowFilter: true,
  allowFreeze: true,
  gridTemplateColumns: [
    '48px',
    'minmax(360px, 1fr)',
    'minmax(90px, 110px)',
    'minmax(90px, 120px)',
    'minmax(120px, 150px)',
    'minmax(130px, 170px)',
    'minmax(150px, 190px)',
    'minmax(160px, 210px)',
  ].join(' '),
};
