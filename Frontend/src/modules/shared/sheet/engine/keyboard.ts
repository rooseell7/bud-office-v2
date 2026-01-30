// FILE: src/modules/shared/sheet/engine/keyboard.ts

import type React from 'react';

import type { SheetRange } from './types';

export type SheetCell<C extends string = string> = { r: number; c: C };

export type SheetsGridKeyDownDeps<C extends string = string> = {
  canEdit: boolean;

  // editor overlay state
  editorOpen: boolean;
  commitEditor: (dir: 'down' | 'right' | 'none') => void;
  closeEditor: () => void;
  openEditor: (r: number, c: C, opts?: { replace?: boolean; ch?: string }) => void;

  // selection state
  activeCell: SheetCell<C> | null;
  setActiveCell: (cell: SheetCell<C>) => void;

  // anchor for shift-extend selection (numeric column indices, aligned with SheetRange)
  anchor: { r: number; c: number } | null;
  setAnchor: (anchor: { r: number; c: number } | null) => void;

  cols: readonly C[];
  rowsCount: number;

  sel: SheetRange | null;
  setSel: React.Dispatch<React.SetStateAction<SheetRange | null>>;

  // actions
  copySelectionToClipboard: () => void;
  clearSelectionCells: () => void;

  // undo/redo
  undo?: () => void;
  redo?: () => void;
};

/**
 * Sheets-like keyboard handler for grid selection + overlay editor.
 *
 * Notes:
 * - No "G" hotkeys are implemented here (per project requirement).
 * - Paste is handled by onPaste at the grid level.
 */
export function handleSheetsGridKeyDown<C extends string>(
  e: React.KeyboardEvent,
  deps: SheetsGridKeyDownDeps<C>,
) {
  const {
    canEdit,
    editorOpen,
    commitEditor,
    closeEditor,
    openEditor,
    activeCell,
    setActiveCell,
    anchor,
    setAnchor,
    cols,
    rowsCount,
    sel,
    setSel,
    copySelectionToClipboard,
    clearSelectionCells,
    undo,
    redo,
  } = deps;

  if (!canEdit) return;

  // If overlay editor is open — handle editing keys here.
  if (editorOpen) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitEditor('down');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      commitEditor(e.shiftKey ? 'none' : 'right');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeEditor();
      return;
    }
    // Let input handle everything else
    return;
  }

  // Undo/redo (Ctrl+Z / Ctrl+Y, Ctrl+Shift+Z)
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const k = e.key.toLowerCase();
    const isRedo = k === 'y' || (k === 'z' && e.shiftKey);
    const isUndo = k === 'z' && !e.shiftKey;

    if (isUndo) {
      e.preventDefault();
      undo?.();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      redo?.();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    if (sel) {
      e.preventDefault();
      copySelectionToClipboard();
    }
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (sel) {
      e.preventDefault();
      clearSelectionCells();
    }
    return;
  }

  if (!activeCell) return;

  // Start editing like Sheets (Enter/F2 or typing).
  if (e.key === 'Enter' || e.key === 'F2') {
    e.preventDefault();
    openEditor(activeCell.r, activeCell.c);
    return;
  }

  // Single printable character starts editing and replaces cell contents.
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
    // ignore newline
    if (e.key !== '\n' && e.key !== '\r') {
      e.preventDefault();
      openEditor(activeCell.r, activeCell.c, { replace: true, ch: e.key });
      return;
    }
  }

  const maxR = Math.max(0, rowsCount - 1);
  const curCi = cols.indexOf(activeCell.c);

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

  const move = (dr: number, dc: number) => {
    const nr = clamp(activeCell.r + dr, 0, maxR);
    const nc = clamp(curCi + dc, 0, cols.length - 1);
    const ncKey = cols[nc];
    setActiveCell({ r: nr, c: ncKey });

    if (e.shiftKey) {
      const base = anchor ?? { r: activeCell.r, c: curCi };
      if (!anchor) setAnchor(base);
      setSel({ r1: base.r, c1: base.c, r2: nr, c2: nc });
    } else {
      setAnchor({ r: nr, c: nc });
      setSel({ r1: nr, c1: nc, r2: nr, c2: nc });
    }
  };

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    move(-1, 0);
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    move(1, 0);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    move(0, -1);
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    move(0, 1);
  }
}
