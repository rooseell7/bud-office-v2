/**
 * Накладна — тільки матеріали, на базі materialsSheetConfig.
 * Col 9 = materialId (прихований, для push to warehouse).
 */

import type { SheetConfig } from './types';
import {
  materialsSheetConfig,
  materialsSheetColumnHeaders,
  M_COL,
} from './materialsSheetConfig';

const INV_M_COL = { ...M_COL, MATERIAL_ID: 9 } as const;

export const invoiceMaterialsColumnHeaders = [
  ...materialsSheetColumnHeaders,
  'materialId', // hidden
] as const;

export const invoiceMaterialsSheetConfig: Partial<SheetConfig> = {
  ...materialsSheetConfig,
  columnHeaders: [...invoiceMaterialsColumnHeaders],
  columnKeys: ['num', 'name', 'unit', 'qty', 'price', 'total', 'costUnit', 'costTotal', 'note', 'materialId'],
  columnFormats: ['text', 'text', 'text', 'number', 'uah', 'uah', 'uah', 'uah', 'text', 'text'],
  readonlyColumns: [M_COL.NUM, M_COL.TOTAL, M_COL.COST_TOTAL, 9],
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
    undefined,
  ],
  colCount: 10,
  columnWidthDefaults: [48, 360, 90, 90, 120, 130, 120, 130, 180, 0],
  hiddenColumns: [9],
};

export { INV_M_COL, M_COL };
