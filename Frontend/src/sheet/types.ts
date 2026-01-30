/**
 * Canonical sheet types.
 * All table/grid logic lives in src/sheet/**.
 */

/** Cell coordinates (0-based) */
export type CellRef = {
  row: number;
  col: number;
};

/** Cell value (display string) */
export type CellValue = string;

/** Grid data: rows × cols map */
export type GridData = Record<string, CellValue>;

export const ROWS = 100;
export const COLS = 26;
