/**
 * Apply styles command. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import type { CellStyle, StylePatch } from '../types';
import { cellKey } from '../state';
import { normalizeSelection } from '../selection';

export type StyleChange = {
  key: string;
  row: number;
  col: number;
  prev: CellStyle;
  next: CellStyle;
};

function mergeStyle(current: CellStyle | undefined, patch: StylePatch): CellStyle {
  const out = { ...current };
  if (patch.bold !== undefined) out.bold = patch.bold;
  if (patch.italic !== undefined) out.italic = patch.italic;
  if (patch.align !== undefined) out.align = patch.align;
  if (patch.numberFormat !== undefined) out.numberFormat = patch.numberFormat;
  if (patch.fill !== undefined) out.fill = patch.fill;
  return out;
}

export function createApplyStylesCommandFromPatch(
  state: SheetState,
  patch: StylePatch,
): SheetCommand {
  const { selection, cellStyles } = state;
  const norm = normalizeSelection(selection);
  const r1 = Math.min(norm.r1, norm.r2);
  const r2 = Math.max(norm.r1, norm.r2);
  const c1 = Math.min(norm.c1, norm.c2);
  const c2 = Math.max(norm.c1, norm.c2);
  const changes: StyleChange[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const key = cellKey(r, c);
      const prev = cellStyles[key] ?? {};
      const next = mergeStyle(prev, patch);
      changes.push({ key, row: r, col: c, prev: { ...prev }, next });
    }
  }
  return createApplyStylesCommand(changes);
}

export function createApplyStylesCommand(changes: StyleChange[]): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      const cellStyles = { ...state.cellStyles };
      for (const { key, next } of changes) {
        if (Object.keys(next).length === 0) {
          delete cellStyles[key];
        } else {
          cellStyles[key] = next;
        }
      }
      return { ...state, cellStyles };
    },
    undo(state: SheetState): SheetState {
      const cellStyles = { ...state.cellStyles };
      for (const { key, prev } of changes) {
        if (Object.keys(prev).length === 0) {
          delete cellStyles[key];
        } else {
          cellStyles[key] = prev;
        }
      }
      return { ...state, cellStyles };
    },
  };
}
