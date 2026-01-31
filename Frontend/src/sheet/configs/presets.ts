/**
 * Preset configs for sheet. Canonical sheet: src/sheet/**
 */

import type { SheetConfig } from './types';
import { uaLocale } from './types';
const sheetLocale = uaLocale;

export { quoteSheetConfig } from './quoteSheetConfig';
export { quoteSheetColumnHeaders, Q_COL } from './quoteSheetConfig';

export const invoiceSheetConfig: Partial<SheetConfig> = {
  rowCount: 80,
  colCount: 20,
  locale: sheetLocale,
};

export const actSheetConfig: Partial<SheetConfig> = {
  rowCount: 100,
  colCount: 26,
  locale: sheetLocale,
};
