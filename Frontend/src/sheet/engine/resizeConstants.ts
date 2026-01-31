/**
 * Resize constraints. Canonical sheet: src/sheet/**
 */

export const COL_MIN = 70;
export const COL_MAX = 900;
export const ROW_MIN = 24;
export const ROW_MAX = 240;
export const COL_WIDTH_DEFAULT = 140;
export const ROW_HEIGHT_DEFAULT = 28;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampColWidth(w: number): number {
  return clamp(w, COL_MIN, COL_MAX);
}

export function clampRowHeight(h: number): number {
  return clamp(h, ROW_MIN, ROW_MAX);
}
