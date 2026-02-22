/**
 * Documents adapter with edit session. Canonical sheet: src/sheet/**
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

/** Meta shape for document sheet persistence (doc.meta is unknown in DocumentDto). */
type SheetDocMeta = Record<string, unknown> & { sheetSnapshot?: unknown; sheetRevision?: number };

export type DocumentsAdapterMode = 'loading' | 'edit' | 'readonly';

const HEARTBEAT_INTERVAL_MS = 25000;

export function useDocumentsAdapter(documentId: number | null, docType = 'sheet') {
  const [mode, setMode] = useState<DocumentsAdapterMode>('loading');
  const [initialSnapshot, setInitialSnapshot] = useState<SheetSnapshot | null>(null);
  const [holderName, setHolderName] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const revisionRef = useRef<number>(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (snap && typeof snap === 'object') {
          setInitialSnapshot(snap as SheetSnapshot);
        }
        revisionRef.current = meta?.sheetRevision ?? 0;

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

    heartbeatRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [mode, documentId]);

  useEffect(() => {
    return () => {
      if (documentId && tokenRef.current) {
        releaseEditSession(documentId, tokenRef.current).catch(() => {});
      }
    };
  }, [documentId]);

  const adapter = {
    getDraftKey: () => (documentId ? draftKey(docType, documentId) : null),

    loadSnapshot: async () => {
      if (!documentId) return null;
      const doc = await getDocument(documentId);
      const meta = doc?.meta as SheetDocMeta | undefined;
      const snap = meta?.sheetSnapshot;
      if (!snap || typeof snap !== 'object') return null;
      const rev = meta?.sheetRevision ?? 0;
      revisionRef.current = rev;
      return { snapshot: snap as SheetSnapshot, revision: rev };
    },

    saveSnapshot: async (
      snapshot: SheetSnapshot,
      expectedRevision?: number,
    ): Promise<{ revision?: number }> => {
      if (!documentId) throw new Error('No document');
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
          },
          expectedRevision: currentRev,
          editSessionToken: tokenRef.current ?? undefined,
        });
        const updatedMeta = updated?.meta as SheetDocMeta | undefined;
        revisionRef.current = updatedMeta?.sheetRevision ?? currentRev + 1;
        return { revision: revisionRef.current };
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
