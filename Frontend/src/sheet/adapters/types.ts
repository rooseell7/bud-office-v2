/**
 * Adapter types. Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from '../engine/types';

export type SheetAdapter = {
  /** Key for local draft (e.g. sheet_draft_quote_123) */
  getDraftKey?(): string | null;
  loadSnapshot?(): Promise<SheetSnapshot | null>;
  saveSnapshot?(snapshot: SheetSnapshot, expectedRevision?: number): Promise<{ revision?: number }>;
};
