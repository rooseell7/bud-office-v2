/**
 * Command execution + history. Canonical sheet: src/sheet/**
 */

import type { SheetState } from './state';
import type { SheetCommand } from './commands/types';

/** Execute command, push to undo stack, clear redo stack */
export function executeCommand(
  state: SheetState,
  command: SheetCommand,
): SheetState {
  const next = command.do(state);
  return {
    ...next,
    undoStack: [...state.undoStack, command],
    redoStack: [],
  };
}
