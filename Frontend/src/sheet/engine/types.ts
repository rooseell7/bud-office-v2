/**
 * Engine types. Canonical sheet: src/sheet/**
 */

/** Cell coordinates (0-based) */
export type CellCoord = {
  row: number;
  col: number;
};

/** Selection range. Indices 0-based, inclusive. */
export type SelectionRange = {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
};

/** Per-cell style */
export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  numberFormat?: 'plain' | 'number' | 'uah' | 'percent';
  fill?: string;
  /** Decimal places for number/uah/percent display (0-6) */
  decimalPlaces?: number;
};

export type StylePatch = Partial<CellStyle> & {
  /** +1 or -1 to adjust decimal places for selection (per-cell) */
  decimalPlacesDelta?: number;
};

/** Toggle state for computed style */
export type ToggleState = 'on' | 'off' | 'mixed';

/** Cell value type */
export type CellValueType = 'text' | 'number' | 'formula';

/** Cell validation error */
export type CellError = {
  code: 'INVALID_NUMBER' | 'INVALID_PERCENT' | 'INVALID_UAH';
  message: string;
};

/** Column computed formula (expr uses {key} refs) */
export type ColumnComputed = {
  expr: string;
  deps?: string[];
};

/** Column definition (id + title + optional meta) */
export type SheetColumn = {
  id: string;
  title: string;
  /** Stable key for named refs in computed formulas (e.g. qty, price) */
  key?: string;
  type?: 'text' | 'number' | 'uah' | 'percent';
  wrap?: boolean;
  editable?: boolean;
  /** Computed formula: expr like {qty} * {price}. Column becomes readonly. */
  computed?: ColumnComputed;
};

/** Raw + computed cell (for formulas) */
export type CellData = {
  raw: string;
  value: string | number;
  type: CellValueType;
};

/** Filter for text column */
export type TextFilterSpec = {
  type: 'text';
  contains?: string;
  isEmpty?: boolean;
  isNotEmpty?: boolean;
};

/** Filter for number/uah/percent column */
export type NumberFilterSpec = {
  type: 'number';
  min?: number;
  max?: number;
  isEmpty?: boolean;
  isNotEmpty?: boolean;
};

export type FilterSpec = TextFilterSpec | NumberFilterSpec;

/** Sheet snapshot: persisted data (no transient) */
export type SheetSnapshot = {
  values: string[][];
  /** Raw input per cell (formulas, etc.). When present, values are computed from raw. */
  rawValues?: string[][];
  styles?: Record<string, CellStyle>;
  columnWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  /** Column definitions (when present, overrides config for headers/formats) */
  columns?: SheetColumn[];
  rowCount?: number;
  colCount?: number;
  /** Per-cell validation errors (cellKey -> error) */
  cellErrors?: Record<string, CellError>;
  /** Stable row ids for sort/filter (len = rowCount) */
  rowIds?: string[];
  /** Filter mode enabled */
  filtersEnabled?: boolean;
  /** Filters by column id or key */
  filters?: Record<string, FilterSpec>;
  /** Freeze panes: N rows from top, N cols from left */
  freeze?: { rows: number; cols: number };
  /** Cell comments (cellKey -> text) */
  cellComments?: Record<string, string>;
};
