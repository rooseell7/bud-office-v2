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
};

export type StylePatch = Partial<CellStyle>;

/** Toggle state for computed style */
export type ToggleState = 'on' | 'off' | 'mixed';

/** Cell value type */
export type CellValueType = 'text' | 'number' | 'formula';

/** Raw + computed cell (for formulas) */
export type CellData = {
  raw: string;
  value: string | number;
  type: CellValueType;
};

/** Sheet snapshot: persisted data (no transient) */
export type SheetSnapshot = {
  values: string[][];
  /** Raw input per cell (formulas, etc.). When present, values are computed from raw. */
  rawValues?: string[][];
  styles?: Record<string, CellStyle>;
  columnWidths?: Record<number, number>;
  rowCount?: number;
  colCount?: number;
};
