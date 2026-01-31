/**
 * Freeze panes commands. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';

export function createSetFreezeRowsCommand(next: number): SheetCommand {
  let prev = 0;
  return {
    do(state: SheetState): SheetState {
      prev = state.freeze?.rows ?? 0;
      const clamped = Math.max(0, Math.min(next, state.rowCount));
      return {
        ...state,
        freeze: {
          rows: clamped,
          cols: state.freeze?.cols ?? 0,
        },
      };
    },
    undo(state: SheetState): SheetState {
      return {
        ...state,
        freeze: {
          rows: prev,
          cols: state.freeze?.cols ?? 0,
        },
      };
    },
  };
}

export function createSetFreezeColsCommand(next: number): SheetCommand {
  let prev = 0;
  return {
    do(state: SheetState): SheetState {
      prev = state.freeze?.cols ?? 0;
      const clamped = Math.max(0, Math.min(next, state.colCount));
      return {
        ...state,
        freeze: {
          rows: state.freeze?.rows ?? 0,
          cols: clamped,
        },
      };
    },
    undo(state: SheetState): SheetState {
      return {
        ...state,
        freeze: {
          rows: state.freeze?.rows ?? 0,
          cols: prev,
        },
      };
    },
  };
}
