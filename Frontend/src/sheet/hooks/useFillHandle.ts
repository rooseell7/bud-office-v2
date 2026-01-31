/**
 * Fill handle drag for drag-to-fill. Canonical sheet: src/sheet/**
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export function useFillHandle(
  sourceRange: { r1: number; r2: number; c1: number; c2: number } | null,
  rowCount: number,
  onApplyFill: (
    source: { r1: number; r2: number; c1: number; c2: number },
    target: { r1: number; r2: number; c1: number; c2: number },
  ) => void,
) {
  const [isDragging, setIsDragging] = useState(false);
  const [targetRange, setTargetRange] = useState<{
    r1: number;
    r2: number;
    c1: number;
    c2: number;
  } | null>(null);
  const targetRef = useRef<typeof targetRange>(null);
  targetRef.current = targetRange;

  const onMouseDown = useCallback(() => {
    if (!sourceRange) return;
    setIsDragging(true);
    setTargetRange(null);
    targetRef.current = null;
  }, [sourceRange]);

  useEffect(() => {
    if (!isDragging || !sourceRange) return;

    const { r1: sR1, r2: sR2, c1: sC1, c2: sC2 } = sourceRange;

    const getRowFromElement = (el: Element | null): number | null => {
      let node: Element | null = el;
      while (node) {
        const r = (node as HTMLElement).getAttribute?.('data-row');
        if (r != null) return parseInt(r, 10);
        node = node.parentElement;
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = getRowFromElement(el);
      if (row == null || row < 0 || row >= rowCount) {
        setTargetRange(null);
        return;
      }
      if (row > sR2) {
        const tr = { r1: sR2 + 1, r2: row, c1: sC1, c2: sC2 };
        setTargetRange(tr);
        targetRef.current = tr;
      } else if (row < sR1 && sR1 > 0) {
        const tr = { r1: row, r2: sR1 - 1, c1: sC1, c2: sC2 };
        setTargetRange(tr);
        targetRef.current = tr;
      } else {
        setTargetRange(null);
        targetRef.current = null;
      }
    };

    const onUp = () => {
      const tr = targetRef.current;
      if (tr) {
        onApplyFill(sourceRange, tr);
      }
      setIsDragging(false);
      setTargetRange(null);
      targetRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, sourceRange, rowCount, onApplyFill]);

  return { isDragging, targetRange, onFillHandleMouseDown: onMouseDown };
}
