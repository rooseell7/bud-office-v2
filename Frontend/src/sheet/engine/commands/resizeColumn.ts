/**
 * Column resize command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';

export function createResizeColumnCommand(
  colIndex: number,
  prevWidth: number,
  nextWidth: number,
): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      const c = Math.max(0, Math.min(colIndex, state.colCount - 1));
      const columnWidths = { ...state.columnWidths, [c]: nextWidth };
      return { ...state, columnWidths };
    },
    undo(state: SheetState): SheetState {
      const c = Math.max(0, Math.min(colIndex, state.colCount - 1));
      const columnWidths = { ...state.columnWidths, [c]: prevWidth };
      return { ...state, columnWidths };
    },
  };
}
