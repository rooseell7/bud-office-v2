import { useEffect, useCallback } from 'react';
import type { Dispatch } from 'react';
import {
  START_EDIT,
  CANCEL_EDIT,
  COMMIT_EDIT,
  MOVE_ACTIVE,
  UNDO,
  REDO,
  type SheetAction,
} from '../engine';
import { clampCell } from '../engine/selection';

export type UseSheetKeymapOptions = {
  state: { isEditing: boolean; activeCell: { row: number; col: number }; rowCount: number; colCount: number };
  dispatch: Dispatch<SheetAction>;
  readonly?: boolean;
  /** When provided, Ctrl+Z uses server undo instead of local */
  onServerUndo?: () => Promise<boolean>;
  /** When provided, Ctrl+Y uses server redo instead of local */
  onServerRedo?: () => Promise<boolean>;
  /** Called when server undo/redo fails (e.g. conflict) */
  onServerUndoError?: (message: string) => void;
};

export function useSheetKeymap(options: UseSheetKeymapOptions) {
  const { state, dispatch, readonly, onServerUndo, onServerRedo, onServerUndoError } = options;
  const { isEditing, activeCell, rowCount, colCount } = state;

  const move = useCallback(
    (dr: number, dc: number, shiftKey = false) => {
      const next = clampCell(
        { row: activeCell.row + dr, col: activeCell.col + dc },
        rowCount,
        colCount,
      );
      dispatch({ type: MOVE_ACTIVE, payload: { coord: next, shiftKey } });
    },
    [activeCell, rowCount, colCount, dispatch],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          dispatch({ type: CANCEL_EDIT });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          dispatch({ type: COMMIT_EDIT, payload: { direction: e.shiftKey ? 'up' : 'down' } });
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          dispatch({ type: COMMIT_EDIT, payload: { direction: e.shiftKey ? 'left' : 'right' } });
          return;
        }
        return;
      }

      if (!readonly && (e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (onServerUndo && !e.shiftKey) {
          onServerUndo().then((ok) => {
            if (!ok) onServerUndoError?.('Неможливо відкотити');
          }).catch(() => onServerUndoError?.('Помилка відкату'));
        } else if (onServerRedo && e.shiftKey) {
          onServerRedo().then((ok) => {
            if (!ok) onServerUndoError?.('Неможливо повторити');
          }).catch(() => onServerUndoError?.('Помилка повтору'));
        } else {
          if (e.shiftKey) dispatch({ type: REDO });
          else dispatch({ type: UNDO });
        }
        return;
      }
      if (!readonly && (e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (onServerRedo) {
          onServerRedo().then((ok) => {
            if (!ok) onServerUndoError?.('Неможливо повторити');
          }).catch(() => onServerUndoError?.('Помилка повтору'));
        } else {
          dispatch({ type: REDO });
        }
        return;
      }

      if (e.key === 'Enter' && !readonly) {
        e.preventDefault();
        dispatch({ type: START_EDIT });
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        move(0, e.shiftKey ? -1 : 1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1, 0, e.shiftKey);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1, 0, e.shiftKey);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(0, 1, e.shiftKey);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(0, -1, e.shiftKey);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, dispatch, move]);
}
