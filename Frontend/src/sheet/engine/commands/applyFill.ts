/**
 * Apply fill command (drag-fill). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { cellKey } from '../state';
import { createApplyValuesCommand } from './applyValues';
import { createApplyStylesCommand } from './applyStyles';
import type { StyleChange } from './applyStyles';
import { computeFillChanges } from '../fill/computeFillChanges';
import { validateCellByColumnType } from '../locale/validateCell';

function composeCommands(first: SheetCommand, second: SheetCommand): SheetCommand {
  return {
    do(state) {
      return second.do(first.do(state));
    },
    undo(state) {
      return first.undo(second.undo(state));
    },
  };
}

export function createApplyFillCommand(
  state: SheetState,
  sourceRange: { r1: number; r2: number; c1: number; c2: number },
  targetRange: { r1: number; r2: number; c1: number; c2: number },
): SheetCommand {
  const { changes } = computeFillChanges(state, sourceRange, targetRange);

  const valueChanges: { row: number; col: number; prev: string; next: string; nextError?: import('../types').CellError | null }[] = [];
  const styleChanges: StyleChange[] = [];

  for (const { r, c, prevRaw, nextRaw, prevStyle, nextStyle } of changes) {
    const colDef = state.columns?.[c];
    const { error } = validateCellByColumnType(nextRaw, colDef?.type, state.locale, { min: 0 });
    valueChanges.push({
      row: r,
      col: c,
      prev: prevRaw,
      next: nextRaw,
      nextError: error ?? null,
    });
    const key = cellKey(r, c);
    styleChanges.push({
      key,
      row: r,
      col: c,
      prev: prevStyle ?? {},
      next: nextStyle ?? {},
    });
  }

  const valuesCmd = createApplyValuesCommand(valueChanges);
  const stylesCmd = createApplyStylesCommand(styleChanges);
  return composeCommands(valuesCmd, stylesCmd);
}
