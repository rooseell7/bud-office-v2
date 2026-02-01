/**
 * Stage sheet adapter. Load/save sheet by docKey (estimate:id:stage:stageId:works|materials).
 * REST only — no collab for staged estimates (phase 1).
 */

import { useEffect, useRef, useState } from 'react';
import { getSheetByDocKey, saveSheetByDocKey } from '../../api/estimates';
import type { SheetSnapshot } from '../engine/types';

export type StageAdapterMode = 'loading' | 'edit' | 'readonly';

export function useStageSheetAdapter(
  estimateId: number | null,
  docKey: string | null,
) {
  const [mode, setMode] = useState<StageAdapterMode>('loading');
  const [initialSnapshot, setInitialSnapshot] = useState<SheetSnapshot | null>(null);

  useEffect(() => {
    if (!estimateId || !docKey) {
      setMode('edit');
      setInitialSnapshot(null);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { snapshot } = await getSheetByDocKey(estimateId, docKey);
        if (mounted && snapshot) {
          setInitialSnapshot(snapshot as SheetSnapshot);
        }
        if (mounted) setMode('edit');
      } catch {
        if (mounted) setMode('edit');
        setInitialSnapshot(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [estimateId, docKey]);

  const adapter = {
    getDraftKey: () => (docKey ? `stage:${docKey}` : null),

    loadSnapshot: async () => {
      if (!estimateId || !docKey) return null;
      const { snapshot, revision } = await getSheetByDocKey(estimateId, docKey);
      return { snapshot: snapshot as SheetSnapshot, revision };
    },

    saveSnapshot: async (
      snapshot: SheetSnapshot,
      expectedRevision?: number,
    ): Promise<{ revision?: number }> => {
      if (!estimateId || !docKey) throw new Error('No estimate or docKey');
      try {
        const { revision } = await saveSheetByDocKey(
          estimateId,
          docKey,
          snapshot,
          expectedRevision,
        );
        return { revision };
      } catch (e: any) {
        if (e?.response?.status === 409) throw new Error('CONFLICT');
        throw e;
      }
    },
  };

  return { adapter, mode, initialSnapshot };
}
