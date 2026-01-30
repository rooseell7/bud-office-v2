/**
 * Local draft persist. Canonical sheet: src/sheet/**
 */

import { useEffect, useRef } from 'react';
import { serialize } from '../engine/serialize';
import { loadDraft, saveDraft } from '../adapters/localDraftAdapter';
import type { SheetState } from '../engine/state';
import type { SheetAdapter } from '../adapters/types';

const DEBOUNCE_MS = 500;

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
        onHydrate(draft);
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
