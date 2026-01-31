/**
 * Quote (КП) documents adapter. Extends useDocumentsAdapter with:
 * - load: initial 1–3 row snapshot when empty
 * - save: compute quoteTotals and store in meta.quoteTotals
 */

import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  updateDocument,
  acquireEditSession,
  heartbeatEditSession,
  releaseEditSession,
} from '../../api/documents';
import { draftKey } from '../adapters/localDraftAdapter';
import type { SheetSnapshot } from '../engine/types';
import {
  computeQuoteTotals,
  getInitialQuoteSnapshot,
} from '../adapters/quoteAdapter';

export type DocumentsAdapterMode = 'loading' | 'edit' | 'readonly';

const HEARTBEAT_INTERVAL_MS = 25000;

export function useQuoteAdapter(documentId: number | null) {
  const [mode, setMode] = useState<DocumentsAdapterMode>('loading');
  const [initialSnapshot, setInitialSnapshot] = useState<SheetSnapshot | null>(null);
  const [holderName, setHolderName] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setMode('edit');
      setInitialSnapshot(null);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const doc = await getDocument(documentId);
        const snap = doc?.meta?.sheetSnapshot;
        if (snap && typeof snap === 'object' && (snap.rawValues?.length || snap.values?.length)) {
          if (mounted) setInitialSnapshot(snap as SheetSnapshot);
        } else {
          if (mounted) setInitialSnapshot(getInitialQuoteSnapshot());
        }

        const session = await acquireEditSession(documentId);
        if (!mounted) return;
        tokenRef.current = session.token;
        setMode('edit');
      } catch (e: any) {
        if (!mounted) return;
        const status = e?.response?.status;
        const data = e?.response?.data;
        if (status === 409 || status === 423) {
          setMode('readonly');
          setHolderName(data?.holderUserId ? `User ${data.holderUserId}` : null);
        } else {
          setMode('edit');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (mode !== 'edit' || !documentId || !tokenRef.current) return;
    const beat = () => {
      heartbeatEditSession(documentId, tokenRef.current!).catch(() => {
        setMode('readonly');
      });
    };
    const id = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, documentId]);

  useEffect(() => {
    return () => {
      if (documentId && tokenRef.current) {
        releaseEditSession(documentId, tokenRef.current).catch(() => {});
      }
    };
  }, [documentId]);

  const adapter = {
    getDraftKey: () => (documentId ? draftKey('quote', documentId) : null),

    loadSnapshot: async () => {
      if (!documentId) return null;
      const doc = await getDocument(documentId);
      const snap = doc?.meta?.sheetSnapshot;
      const rev = (doc?.meta as any)?.sheetRevision;
      const snapshot =
        snap && typeof snap === 'object' && (snap.rawValues?.length || snap.values?.length)
          ? (snap as SheetSnapshot)
          : getInitialQuoteSnapshot();
      return { snapshot, revision: rev };
    },

    saveSnapshot: async (
      snapshot: SheetSnapshot,
      expectedRevision?: number,
    ): Promise<{ revision?: number }> => {
      if (!documentId) throw new Error('No document');
      const quoteTotals = computeQuoteTotals(snapshot);
      const doc = await getDocument(documentId);
      const currentRev = (doc?.meta as any)?.sheetRevision ?? 0;
      if (expectedRevision !== undefined && currentRev !== expectedRevision) {
        throw new Error('CONFLICT');
      }
      try {
        const updated = await updateDocument(documentId, {
          meta: {
            ...(doc?.meta ?? {}),
            sheetSnapshot: snapshot,
            sheetRevision: currentRev + 1,
            quoteTotals,
          },
          expectedRevision: currentRev,
          editSessionToken: tokenRef.current ?? undefined,
        });
        return { revision: (updated?.meta as any)?.sheetRevision ?? currentRev + 1 };
      } catch (e: any) {
        if (e?.response?.status === 409) throw new Error('CONFLICT');
        if (e?.response?.status === 423) throw new Error('LOCKED');
        throw e;
      }
    },
  };

  return { adapter, mode, initialSnapshot, holderName };
}
