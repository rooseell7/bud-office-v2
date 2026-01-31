/**
 * Adapter types. Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from '../engine/types';

export type LoadSnapshotResult = SheetSnapshot | { snapshot: SheetSnapshot; revision?: number } | null;

export type SheetAdapter = {
  /** Key for local draft (e.g. sheet_draft_quote_123) */
  getDraftKey?(): string | null;
  loadSnapshot?(): Promise<LoadSnapshotResult>;
  saveSnapshot?(
    snapshot: SheetSnapshot,
    expectedRevision?: number,
    prevSnapshot?: SheetSnapshot | null,
  ): Promise<{ revision?: number }>;
  /** Server undo (collab mode). Returns result with snapshot if ok. */
  requestUndo?(): Promise<{ ok: boolean; snapshot?: any; reason?: string; details?: string }>;
  /** Server redo (collab mode). */
  requestRedo?(): Promise<{ ok: boolean; snapshot?: any; reason?: string; details?: string }>;
};
