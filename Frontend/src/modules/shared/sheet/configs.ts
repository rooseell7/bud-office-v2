/**
 * Sheet configs are intended to standardize column/row behaviors across:
 * - Quotes (KP): works + materials + percents
 * - Acts: works-only
 * - Invoices: materials-only
 *
 * H4 creates the shared primitives; adopting a fully generic renderer can be done incrementally.
 */

export type SheetKind = 'quote:work' | 'quote:material' | 'act:work' | 'invoice:material';

export type SheetColumn<T> = {
  key: string;
  title: string;
  width?: number | string;
  // For future: data binding, validation, parsing, formatting.
  get?: (row: T) => unknown;
  set?: (row: T, value: unknown) => T;
};

export type SheetConfig<T> = {
  kind: SheetKind;
  columns: SheetColumn<T>[];
};

export const QUOTE_WORK_SHEET_CONFIG: SheetConfig<any> = {
  kind: 'quote:work',
  columns: [],
};

export const QUOTE_MATERIAL_SHEET_CONFIG: SheetConfig<any> = {
  kind: 'quote:material',
  columns: [],
};

export const ACT_WORK_SHEET_CONFIG: SheetConfig<any> = {
  kind: 'act:work',
  columns: [],
};

export const INVOICE_MATERIAL_SHEET_CONFIG: SheetConfig<any> = {
  kind: 'invoice:material',
  columns: [],
};
