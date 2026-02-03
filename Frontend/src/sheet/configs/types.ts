/**
 * Config types. Canonical sheet: src/sheet/**
 */

export type LocaleSettings = {
  decimalSeparator: ',' | '.';
  argSeparator: ';' | ',';
  thousandsSeparator?: ' ' | '\u00A0' | ',' | '.';
};

export const defaultLocale: LocaleSettings = {
  decimalSeparator: '.',
  argSeparator: ',',
};

/** UA locale for BUD Office */
export const uaLocale: LocaleSettings = {
  decimalSeparator: ',',
  argSeparator: ';',
  thousandsSeparator: ' ',
};

/** Column format hint for КП/Acts (default numberFormat per col) */
export type ColumnFormat = 'text' | 'number' | 'uah' | 'percent';

/** Computed column: value derived from other cells in same row (not stored, no undo) */
export type ComputedColumnDef = {
  col: number;
  /** (row, getNum) => computed number. getNum(r,c) returns numeric value or 0 */
  compute: (row: number, getNum: (r: number, c: number) => number) => number;
};

export type SheetConfig = {
  colCount: number;
  rowCount: number;
  colWidth?: number;
  rowHeight?: number;
  locale?: LocaleSettings;
  /** Optional column headers (№, Назва, Од., etc.) — shown instead of A,B,C */
  columnHeaders?: string[];
  /** Default format per column index (for new cells) */
  columnFormats?: ColumnFormat[];
  /** Readonly column indices (e.g. computed Sum, Total) */
  readonlyColumns?: number[];
  /** Column index that grows to fill space (e.g. Name) */
  flexColumn?: number;
  /** CSS grid-template-columns with minmax() for responsive layout (overrides flex when set) */
  gridTemplateColumns?: string;
  /** Default width per column (px) when not yet resized. Used to build dynamic grid from columnWidths. */
  columnWidthDefaults?: number[];
  /** Per-column wrap: true = text wraps (e.g. "Найменування"). Indices match columnHeaders. */
  columnWrap?: boolean[];
  /** Allow insert column left/right via context menu */
  allowColumnInsert?: boolean;
  /** Allow delete column via context menu */
  allowColumnDelete?: boolean;
  /** Allow rename column via double-click / context menu */
  allowColumnRename?: boolean;
  /** Allow insert row above/below via context menu */
  allowRowInsert?: boolean;
  /** Allow delete row via context menu */
  allowRowDelete?: boolean;
  /** Minimum columns (delete disabled when at limit) */
  minColumns?: number;
  /** Minimum rows (delete disabled when at limit) */
  minRows?: number;
  /** Column ids that cannot be deleted (e.g. "col-0" for №) */
  protectedColumnIds?: string[];
  /** Row indexes that cannot be deleted (optional) */
  protectedRowIndexes?: number[];
  /** Allow bulk delete of selected columns/rows */
  allowDeleteMultiple?: boolean;
  /** Show confirm dialog before delete (default true) */
  confirmDangerousOperations?: boolean;
  /** Engine-level derived columns (legacy, computed at display) */
  computedColumns?: ComputedColumnDef[];
  /** Stable keys for columns (for named refs in computed) */
  columnKeys?: string[];
  /** Computed expr per column index: { expr: '{qty} * {price}' } */
  columnComputeds?: Array<{ expr: string } | undefined>;
  /** Allow edit column formula via context menu */
  allowColumnFormulaEdit?: boolean;
  /** Allow sort via context menu */
  allowSort?: boolean;
  /** Allow filter via context menu */
  allowFilter?: boolean;
  /** Allow freeze panes via context menu */
  allowFreeze?: boolean;
  /** Autocomplete for name column (КП): colIndex + dict type */
  autocompleteForColumn?: { colIndex: number; type: 'works' | 'materials'; materialIdColIndex?: number };
  /** Hidden column indices (e.g. cost columns when hideCost) */
  hiddenColumns?: number[];
  /** Allow cell comments (context menu, indicator) */
  allowCellComments?: boolean;
};
