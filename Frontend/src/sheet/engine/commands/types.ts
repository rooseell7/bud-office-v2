/**
 * Command types. Canonical sheet: src/sheet/**
 */

import type { SheetState } from '../state';

export type SheetCommand = {
  do(state: SheetState): SheetState;
  undo(state: SheetState): SheetState;
};
