/**
 * Batch reflow row heights command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';

export function createReflowRowHeightsCommand(
  rows: number[],
  prevHeights: number[],
  nextHeights: number[],
): SheetCommand {
  if (rows.length === 0) {
    return {
      do: (s) => s,
      undo: (s) => s,
    };
  }

  return {
    do(state: SheetState): SheetState {
      const rowHeights = { ...state.rowHeights };
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        rowHeights[r] = nextHeights[i];
      }
      return { ...state, rowHeights };
    },
    undo(state: SheetState): SheetState {
      const rowHeights = { ...state.rowHeights };
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        rowHeights[r] = prevHeights[i];
      }
      return { ...state, rowHeights };
    },
  };
}
