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

/** Meta shape for document sheet persistence (doc.meta is unknown in DocumentDto). */
type SheetDocMeta = Record<string, unknown> & { sheetSnapshot?: unknown; sheetRevision?: number };

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
        const meta = doc?.meta as SheetDocMeta | undefined;
        const snap = meta?.sheetSnapshot;
        const snapObj = snap && typeof snap === 'object' ? (snap as SheetSnapshot) : null;
        if (snapObj && (snapObj.rawValues?.length || snapObj.values?.length)) {
          if (mounted) setInitialSnapshot(snapObj);
        } else {
          if (mounted) setInitialSnapshot(getInitialQuoteSnapshot());
        }

        const session = await acquireEditSession(documentId);
        if (!mounted) return;
        tokenRef.current = session.token;
        setMode('edit');
      } catch (e: unknown) {
        if (!mounted) return;
        const err = e as { response?: { status?: number; data?: { holderUserId?: unknown } } };
        const status = err?.response?.status;
        const data = err?.response?.data;
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
      const meta = doc?.meta as SheetDocMeta | undefined;
      const snap = meta?.sheetSnapshot;
      const rev = meta?.sheetRevision;
      const snapObj = snap && typeof snap === 'object' ? (snap as SheetSnapshot) : null;
      const snapshot =
        snapObj && (snapObj.rawValues?.length || snapObj.values?.length)
          ? snapObj
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
      const prevMeta = doc?.meta as SheetDocMeta | undefined;
      const currentRev = prevMeta?.sheetRevision ?? 0;
      if (expectedRevision !== undefined && currentRev !== expectedRevision) {
        throw new Error('CONFLICT');
      }
      try {
        const updated = await updateDocument(documentId, {
          meta: {
            ...(prevMeta && typeof prevMeta === 'object' ? prevMeta : {}),
            sheetSnapshot: snapshot,
            sheetRevision: currentRev + 1,
            quoteTotals,
          },
          expectedRevision: currentRev,
          editSessionToken: tokenRef.current ?? undefined,
        });
        const updatedMeta = updated?.meta as SheetDocMeta | undefined;
        return { revision: updatedMeta?.sheetRevision ?? currentRev + 1 };
      } catch (e: unknown) {
        const ex = e as { response?: { status?: number } };
        if (ex?.response?.status === 409) throw new Error('CONFLICT');
        if (ex?.response?.status === 423) throw new Error('LOCKED');
        throw e;
      }
    },
  };

  return { adapter, mode, initialSnapshot, holderName };
}
