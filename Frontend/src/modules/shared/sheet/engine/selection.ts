// FILE: src/modules/shared/sheet/engine/selection.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SheetCell } from './keyboard';
import type { SheetRange } from './types';

/**
 * Anchor is stored in numeric column index coordinates (aligned with SheetRange).
 * It is the fixed corner of the selection when extending with Shift or mouse.
 */
export type SheetAnchor = { r: number; c: number };

export type UseSheetSelectionOptions = {
  /**
   * If true (default) - selection drag ends when mouse is released anywhere in the window.
   */
  autoEndOnWindowMouseUp?: boolean;
};

export function makeSingleRange(r: number, c: number): SheetRange {
  return { r1: r, c1: c, r2: r, c2: c };
}

function idxOf<C extends string>(cols: readonly C[], c: C): number {
  const i = cols.indexOf(c);
  return i < 0 ? 0 : i;
}

/**
 * Shared selection model for Sheets-like tables.
 *
 * - activeCell uses typed column keys
 * - sel uses numeric column indices (SheetRange)
 * - anchor keeps the "fixed" corner for extending selection
 */
export function useSheetSelection<C extends string>(
  cols: readonly C[],
  opts: UseSheetSelectionOptions = {},
) {
  const { autoEndOnWindowMouseUp = true } = opts;

  const [activeCell, setActiveCell] = useState<SheetCell<C> | null>(null);
  const [sel, setSel] = useState<SheetRange | null>(null);

  const anchorRef = useRef<SheetAnchor | null>(null);
  const isMouseSelectingRef = useRef(false);

  const colIndex = useCallback((c: C) => idxOf(cols, c), [cols]);

  const setAnchor = useCallback((a: SheetAnchor | null) => {
    anchorRef.current = a;
  }, []);

  const getAnchor = useCallback(() => anchorRef.current, []);

  const selectCell = useCallback(
    (r: number, c: C) => {
      const ci = colIndex(c);
      setActiveCell({ r, c });
      setSel(makeSingleRange(r, ci));
      setAnchor({ r, c: ci });
    },
    [colIndex, setAnchor],
  );

  const beginMouseSelection = useCallback(
    (r: number, c: C) => {
      isMouseSelectingRef.current = true;
      selectCell(r, c);
    },
    [selectCell],
  );

  const extendMouseSelection = useCallback(
    (r: number, c: C) => {
      if (!isMouseSelectingRef.current) return;
      const ci = colIndex(c);
      setSel((prev) => {
        if (!prev) {
          const a = getAnchor();
          if (a) return { r1: a.r, c1: a.c, r2: r, c2: ci };
          return makeSingleRange(r, ci);
        }
        return { ...prev, r2: r, c2: ci };
      });
    },
    [colIndex, getAnchor],
  );

  const endMouseSelection = useCallback(() => {
    isMouseSelectingRef.current = false;
  }, []);

  useEffect(() => {
    if (!autoEndOnWindowMouseUp) return;
    const up = () => endMouseSelection();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [autoEndOnWindowMouseUp, endMouseSelection]);

  return useMemo(
    () => ({
      activeCell,
      setActiveCell,
      sel,
      setSel,
      anchorRef,
      getAnchor,
      setAnchor,
      isMouseSelectingRef,
      colIndex,
      selectCell,
      beginMouseSelection,
      extendMouseSelection,
      endMouseSelection,
    }),
    [
      activeCell,
      sel,
      getAnchor,
      setAnchor,
      colIndex,
      selectCell,
      beginMouseSelection,
      extendMouseSelection,
      endMouseSelection,
    ],
  );
}
