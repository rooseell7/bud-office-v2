/**
 * Batch delete columns (1 undo step). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { createDeleteColumnCommand } from './deleteColumn';

export function createDeleteColumnsBatchCommand(
  colIndexes: number[],
  buildPayload: (state: SheetState, col: number) => import('./deleteColumn').DeleteColumnPayload,
): SheetCommand {
  const sorted = [...colIndexes].sort((a, b) => b - a);
  const stored: { commands: SheetCommand[] } = { commands: [] };

  return {
    do(state: SheetState): SheetState {
      stored.commands = [];
      let s = state;
      for (const col of sorted) {
        const cmd = createDeleteColumnCommand(buildPayload(s, col));
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
