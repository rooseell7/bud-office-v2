// FILE: src/modules/shared/sheet/engine/types.ts

/**
 * Range selection in a grid.
 * Indices are 0-based and inclusive.
 */
export type SheetRange = {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
};
