/**
 * Batch delete rows (1 undo step). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { createDeleteRowCommand } from './rowOps';

export function createDeleteRowsBatchCommand(
  rowIndexes: number[],
  getCapturedRow: (state: SheetState, row: number) => string[] | undefined,
): SheetCommand {
  const sorted = [...rowIndexes].sort((a, b) => b - a);
  const stored: { commands: SheetCommand[] } = { commands: [] };

  return {
    do(state: SheetState): SheetState {
      stored.commands = [];
      let s = state;
      for (const row of sorted) {
        const captured = getCapturedRow(s, row);
        const cmd = createDeleteRowCommand(row, captured);
        stored.commands.push(cmd);
        s = cmd.do(s);
      }
      return s;
    },
    undo(state: SheetState): SheetState {
      let s = state;
      for (let i = stored.commands.length - 1; i >= 0; i--) {
        s = stored.commands[i].undo(s);
      }
      return s;
    },
  };
}
