/**
 * Local draft adapter. Canonical sheet: src/sheet/**
 */

import type { SheetSnapshot } from '../engine/types';

const STORAGE_KEY_PREFIX = 'sheet_draft_';

export function draftKey(docType: string, docId: string | number): string {
  return `${STORAGE_KEY_PREFIX}${docType}_${docId}`;
}

export function loadDraft(key: string): SheetSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SheetSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, snapshot: SheetSnapshot): void {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // quota exceeded or private mode
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
