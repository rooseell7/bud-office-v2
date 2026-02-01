/**
 * Computed style for selection. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import type { ToggleState } from './types';
import { cellKey } from './state';
import { normalizeSelection } from './selection';

export type ComputedStyle = {
  bold: ToggleState;
  italic: ToggleState;
  align: 'left' | 'center' | 'right' | 'mixed';
  numberFormat: 'plain' | 'number' | 'uah' | 'percent' | 'mixed';
};

export function getComputedStyleForSelection(
  state: SheetState,
): ComputedStyle {
  const { selection, cellStyles } = state;
  const norm = normalizeSelection(selection);
  const r1 = Math.min(norm.r1, norm.r2);
  const r2 = Math.max(norm.r1, norm.r2);
  const c1 = Math.min(norm.c1, norm.c2);
  const c2 = Math.max(norm.c1, norm.c2);

  let boldTrue = 0;
  let boldFalse = 0;
  let italicTrue = 0;
  let italicFalse = 0;
  const aligns = new Set<string>();
  const formats = new Set<string>();

  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const key = cellKey(r, c);
      const s = cellStyles[key];
      if (s?.bold) boldTrue++;
      else boldFalse++;
      if (s?.italic) italicTrue++;
      else italicFalse++;
      if (s?.align) aligns.add(s.align);
      const f = s?.numberFormat ?? 'plain';
      formats.add(f);
    }
  }

  const total = (r2 - r1 + 1) * (c2 - c1 + 1);
  const bold: ToggleState =
    boldTrue === total ? 'on' : boldFalse === total ? 'off' : 'mixed';
  const italic: ToggleState =
    italicTrue === total ? 'on' : italicFalse === total ? 'off' : 'mixed';
  const alignList = [...aligns];
  const align: ComputedStyle['align'] =
    alignList.length === 1
      ? (alignList[0] as 'left' | 'center' | 'right')
      : 'mixed';
  const formatList = [...formats];
  const numberFormat: ComputedStyle['numberFormat'] =
    formatList.length === 1
      ? (formatList[0] as 'plain' | 'number' | 'uah' | 'percent')
      : 'mixed';

  return { bold, italic, align, numberFormat };
}
