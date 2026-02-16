/**
 * STEP 7: useDraft hook — load/save/clear draft with debounce.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDraft, saveDraft, clearDraft, type DraftResponse } from './draftsApi';

const DEBOUNCE_MS = 600;

export type UseDraftParams = {
  key: string;
  enabled?: boolean;
  projectId?: number | null;
  entityType: string;
  entityId?: string | null;
  scopeType?: 'global' | 'project' | 'entity';
};

export type UseDraftResult<T> = {
  draft: DraftResponse | null;
  loading: boolean;
  hasDraft: boolean;
  saveDraftData: (payload: T) => void;
  clearDraftData: () => Promise<void>;
  restoreFromDraft: (cb: (payload: T) => void) => void;
};

export function useDraft<T extends Record<string, unknown>>(params: UseDraftParams): UseDraftResult<T> {
  const { key, enabled = true, projectId, entityType, entityId, scopeType = 'project' } = params;
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    setLoading(true);
    loadDraft(key)
      .then((res) => {
        if (!cancelled) setDraft(res);
      })
      .catch(() => {
        if (!cancelled) setDraft(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  const saveDraftData = useCallback(
    (payload: T) => {
      if (!key) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        saveDraft({
          key,
          payload: payload as Record<string, unknown>,
          projectId,
          entityType,
          entityId,
          scopeType,
        }).catch(() => {
          /* ignore */
        });
      }, DEBOUNCE_MS);
    },
    [key, projectId, entityType, entityId, scopeType],
  );

  const clearDraftData = useCallback(async () => {
    if (!key) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    try {
      await clearDraft(key);
      setDraft(null);
    } catch {
      /* ignore */
    }
  }, [key]);

  const restoreFromDraft = useCallback(
    (cb: (payload: T) => void) => {
      if (draft?.payload) {
        cb(draft.payload as T);
        setDraft(null);
      }
    },
    [draft],
  );

  return {
    draft,
    loading,
    hasDraft: !!draft?.payload,
    saveDraftData,
    clearDraftData,
    restoreFromDraft,
  };
}
