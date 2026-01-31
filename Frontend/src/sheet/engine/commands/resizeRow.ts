/**
 * Row resize command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';

export function createResizeRowCommand(
  rowIndex: number,
  prevHeight: number,
  nextHeight: number,
): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      const r = Math.max(0, Math.min(rowIndex, state.rowCount - 1));
      const rowHeights = { ...state.rowHeights, [r]: nextHeight };
      return { ...state, rowHeights };
    },
    undo(state: SheetState): SheetState {
      const r = Math.max(0, Math.min(rowIndex, state.rowCount - 1));
      const rowHeights = { ...state.rowHeights, [r]: prevHeight };
      return { ...state, rowHeights };
    },
  };
}
