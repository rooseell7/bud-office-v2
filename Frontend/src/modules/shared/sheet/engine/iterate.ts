// FILE: src/modules/shared/sheet/engine/iterate.ts

import type { SheetRange } from './types';
import { normalizeRange } from './range';

export function forEachCellInRange<C>(
  range: SheetRange,
  cols: C[],
  fn: (ri: number, ci: number, col: C) => void,
) {
  const r = normalizeRange(range);
  for (let ri = r.r1; ri <= r.r2; ri++) {
    for (let ci = r.c1; ci <= r.c2; ci++) {
      const col = cols[ci];
      if (col === undefined) continue;
      fn(ri, ci, col);
    }
  }
}
