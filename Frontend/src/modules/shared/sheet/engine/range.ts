// FILE: src/modules/shared/sheet/engine/range.ts

import type { SheetRange } from './types';

export function clamp(nv: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, nv));
}

export function normalizeRange(r: SheetRange): SheetRange {
  const r1 = Math.min(r.r1, r.r2);
  const r2 = Math.max(r.r1, r.r2);
  const c1 = Math.min(r.c1, r.c2);
  const c2 = Math.max(r.c1, r.c2);
  return { r1, c1, r2, c2 };
}

export function isInRange(ri: number, ci: number, range: SheetRange | null | undefined): boolean {
  if (!range) return false;
  const r = normalizeRange(range);
  return ri >= r.r1 && ri <= r.r2 && ci >= r.c1 && ci <= r.c2;
}
