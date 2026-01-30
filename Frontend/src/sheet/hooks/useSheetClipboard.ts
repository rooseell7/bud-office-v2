/**
 * Clipboard copy/paste. Canonical sheet: src/sheet/**
 */

import { useEffect } from 'react';
import type { Dispatch } from 'react';
import {
  getSelectionValues,
  toTSV,
  parseTSV,
  PASTE_TSV,
  type SheetAction,
} from '../engine';

import type { SheetState } from '../engine/state';

export type UseSheetClipboardOptions = {
  state: SheetState;
  dispatch: Dispatch<SheetAction>;
  isEditing?: boolean;
  readonly?: boolean;
};

export function useSheetClipboard(options: UseSheetClipboardOptions) {
  const { state, dispatch, isEditing = false, readonly = false } = options;

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (isEditing || readonly) return;
        e.preventDefault();
        const matrix = getSelectionValues(state);
        const tsv = toTSV(matrix);
        if (tsv) {
          try {
            await navigator.clipboard.writeText(tsv);
          } catch {
            const ta = document.createElement('textarea');
            ta.value = tsv;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (isEditing || readonly) return;
        e.preventDefault();
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            const matrix = parseTSV(text);
            if (matrix.length > 0) {
              dispatch({ type: PASTE_TSV, payload: matrix });
            }
          }
        } catch {
          // clipboard read may fail (e.g. not focused, permissions)
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, dispatch, isEditing, readonly]);
}
