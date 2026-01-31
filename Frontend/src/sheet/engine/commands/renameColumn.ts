/**
 * Rename column command (undoable). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';

export function createRenameColumnCommand(
  colIndex: number,
  prevTitle: string,
  nextTitle: string,
): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      const columns = state.columns ? [...state.columns] : [];
      if (colIndex < 0 || colIndex >= columns.length) return state;
      columns[colIndex] = { ...columns[colIndex], title: nextTitle };
      return { ...state, columns };
    },
    undo(state: SheetState): SheetState {
      const columns = state.columns ? [...state.columns] : [];
      if (colIndex < 0 || colIndex >= columns.length) return state;
      columns[colIndex] = { ...columns[colIndex], title: prevTitle };
      return { ...state, columns };
    },
  };
}
