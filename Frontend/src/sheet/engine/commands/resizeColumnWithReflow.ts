/**
 * Composite: resize column + reflow wrap rows (1 undo step). Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { createResizeColumnCommand } from './resizeColumn';
import { createReflowRowHeightsCommand } from './reflowRowHeights';

export function createResizeColumnWithReflowCommand(
  colIndex: number,
  prevWidth: number,
  nextWidth: number,
  affectedRows: number[],
  prevHeights: number[],
  nextHeights: number[],
): SheetCommand {
  const resizeCmd = createResizeColumnCommand(colIndex, prevWidth, nextWidth);
  const reflowCmd = createReflowRowHeightsCommand(affectedRows, prevHeights, nextHeights);

  return {
    do(state: SheetState): SheetState {
      const afterResize = resizeCmd.do(state);
      return reflowCmd.do(afterResize);
    },
    undo(state: SheetState): SheetState {
      const afterReflowUndo = reflowCmd.undo(state);
      return resizeCmd.undo(afterReflowUndo);
    },
  };
}
