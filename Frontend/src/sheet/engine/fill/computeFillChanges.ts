/**
 * Compute fill changes for drag-fill. Canonical sheet: src/sheet/**
 */

import type { SheetState } from '../state';
import type { CellStyle } from '../types';
import { cellKey } from '../state';
import { isFormula } from '../formulas/parse';
import { shiftFormulaByDelta } from '../formulas/shiftByDelta';
import { parseNumericCell } from '../number/parseCellValue';

export type FillChange = {
  r: number;
  c: number;
  prevRaw: string;
  nextRaw: string;
  prevStyle: CellStyle | undefined;
  nextStyle: CellStyle | undefined;
};

export type FillMode = 'copy' | 'series';

/**
 * Detect if we should use series mode: 1 col, >=2 rows, all numeric with constant step.
 */
function detectSeriesMode(
  state: SheetState,
  r1: number,
  r2: number,
  c: number,
): { step: number; last: number } | null {
  if (r2 - r1 < 1) return null;
  const raw1 = state.rawValues[r1]?.[c] ?? '';
  const raw2 = state.rawValues[r2]?.[c] ?? '';
  const n1 = parseNumericCell(raw1, state.locale);
  const n2 = parseNumericCell(raw2, state.locale);
  if (n1 == null || n2 == null || !Number.isFinite(n1) || !Number.isFinite(n2)) return null;
  const step = n2 - n1;
  return { step, last: n2 };
}

export function computeFillChanges(
  state: SheetState,
  sourceRange: { r1: number; r2: number; c1: number; c2: number },
  targetRange: { r1: number; r2: number; c1: number; c2: number },
): { changes: FillChange[]; mode: FillMode } {
  const { r1: sR1, r2: sR2, c1: sC1, c2: sC2 } = sourceRange;
  const { r1: tR1, r2: tR2, c1: tC1, c2: tC2 } = targetRange;
  const changes: FillChange[] = [];
  const sourceH = sR2 - sR1 + 1;
  const sourceW = sC2 - sC1 + 1;

  let mode: FillMode = 'copy';
  if (sourceW === 1 && sourceH >= 2) {
    const series = detectSeriesMode(state, sR1, sR2, sC1);
    if (series) mode = 'series';
  }

  const cols = state.columns ?? [];
  const cellStyles = state.cellStyles ?? {};
  const rawValues = state.rawValues;

  if (mode === 'series') {
    const col = sC1;
    if (cols[col]?.computed) return { changes: [], mode: 'series' };
    const series = detectSeriesMode(state, sR1, sR2, col)!;
    let idx = 0;
    for (let r = tR1; r <= tR2; r++) {
      const val = series.last + series.step * (idx + 1);
      idx++;
      const prevRaw = rawValues[r]?.[col] ?? '';
      const prevStyle = cellStyles[cellKey(r, col)];
      const nextRaw = String(val);
      changes.push({ r, c: col, prevRaw, nextRaw, prevStyle, nextStyle: prevStyle });
    }
  } else {
    for (let r = tR1; r <= tR2; r++) {
      for (let c = tC1; c <= tC2; c++) {
        if (cols[c]?.computed) continue;
        const srcR = sR1 + ((r - tR1) % sourceH + sourceH) % sourceH;
        const srcC = sC1 + ((c - tC1) % sourceW + sourceW) % sourceW;
        const prevRaw = rawValues[r]?.[c] ?? '';
        const prevStyle = cellStyles[cellKey(r, c)];
        let nextRaw = rawValues[srcR]?.[srcC] ?? '';
        const srcStyle = cellStyles[cellKey(srcR, srcC)];
        if (nextRaw && isFormula(nextRaw)) {
          nextRaw = shiftFormulaByDelta(nextRaw, r - srcR, c - srcC);
        }
        changes.push({
          r,
          c,
          prevRaw,
          nextRaw,
          prevStyle,
          nextStyle: srcStyle ? { ...srcStyle } : undefined,
        });
      }
    }
  }

  return { changes, mode };
}
