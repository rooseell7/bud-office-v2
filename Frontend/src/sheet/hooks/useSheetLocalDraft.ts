/**
 * Local draft persist. Canonical sheet: src/sheet/**
 */

import { useEffect, useRef } from 'react';
import { serialize } from '../engine/serialize';
import { loadDraft, saveDraft } from '../adapters/localDraftAdapter';
import type { SheetState } from '../engine/state';
import type { SheetAdapter } from '../adapters/types';

const DEBOUNCE_MS = 500;
const ACT_MIN_ROWS = 20;

function ensureMinRows(snapshot: import('../engine/types').SheetSnapshot, minRows: number): import('../engine/types').SheetSnapshot {
  const rc = snapshot.rowCount ?? (snapshot.rawValues ?? snapshot.values ?? []).length ?? 0;
  if (rc >= minRows) return snapshot;
  const cc = snapshot.colCount ?? (snapshot.rawValues?.[0] ?? snapshot.values?.[0] ?? []).length ?? 9;
  const raw = snapshot.rawValues ?? snapshot.values ?? [];
  const newRaw = raw.map((r) => [...(r ?? [])]);
  while (newRaw.length < minRows) {
    newRaw.push(Array(cc).fill(''));
  }
  const newVal = (snapshot.values ?? raw).map((r) => [...(r ?? [])]);
  while (newVal.length < minRows) {
    newVal.push(Array(cc).fill(''));
  }
  return {
    ...snapshot,
    rawValues: newRaw,
    values: newVal,
    rowCount: minRows,
    colCount: cc,
  };
}

export type UseSheetLocalDraftOptions = {
  state: SheetState;
  adapter?: SheetAdapter | null;
  onHydrate: (snapshot: import('../engine/types').SheetSnapshot) => void;
};

export function useSheetLocalDraft(options: UseSheetLocalDraftOptions) {
  const { state, adapter, onHydrate } = options;
  const didMountRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!adapter?.getDraftKey) return;
    const key = adapter.getDraftKey();
    if (!key) return;

    if (!didMountRef.current) {
      didMountRef.current = true;
      const draft = loadDraft(key);
      if (draft && (draft.values?.length || Object.keys(draft.styles ?? {}).length)) {
        const toApply = (key.startsWith('act:') || key.startsWith('invoice:')) ? ensureMinRows(draft, ACT_MIN_ROWS) : draft;
        onHydrate(toApply);
      }
    }
  }, [adapter, onHydrate]);

  useEffect(() => {
    if (!adapter?.getDraftKey) return;
    const key = adapter.getDraftKey();
    if (!key) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const snapshot = serialize(state);
      saveDraft(key, snapshot);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, adapter]);
}
