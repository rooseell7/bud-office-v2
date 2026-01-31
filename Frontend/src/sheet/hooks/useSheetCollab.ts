/**
 * Collab WebSocket integration. JOIN_DOC on mount, apply ops via WS when connected.
 * Token from AuthContext (same source as apiClient). Reconnect on token change.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CollabClient, type CollabEvent } from '../collab/collabClient';
import { wsBaseUrl } from '../collab/env';
import type { SheetSnapshot } from '../engine/types';

const DEV = import.meta.env?.DEV ?? false;

function generateClientOpId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export type UseSheetCollabOptions = {
  documentId: number | null;
  /** JWT from AuthContext.accessToken (same source as apiClient) */
  token: string | null;
  onRemoteUpdate?: (snapshot: SheetSnapshot) => void;
  /** Resync: load server snapshot and replace local state */
  onResync?: () => void;
  /** When DOC_STATE received (initial join) */
  onDocState?: (version: number) => void;
};

export function useSheetCollab(options: UseSheetCollabOptions) {
  const { documentId, token, onRemoteUpdate, onResync, onDocState } = options;
  const [serverVersion, setServerVersion] = useState(0);
  const [locks, setLocks] = useState<{ cellLocks: Record<string, number>; docLock: number | null }>({
    cellLocks: {},
    docLock: null,
  });
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<CollabClient | null>(null);
  const pendingCountRef = useRef(0);
  const sentOpIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!documentId || !token) return;

    const client = new CollabClient({
      url: wsBaseUrl,
      token,
      onEvent: (ev: CollabEvent) => {
        if (ev.type === 'DOC_STATE') {
          setServerVersion(ev.version);
          setLocks(ev.locks ?? { cellLocks: {}, docLock: null });
          setConnected(true);
          onDocState?.(ev.version);
        }
        if (ev.type === 'OP_APPLIED') {
          setServerVersion(ev.version);
          if (ev.clientOpId && sentOpIdsRef.current.has(ev.clientOpId)) {
            sentOpIdsRef.current.delete(ev.clientOpId);
            pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
          } else if (ev.clientOpId && pendingCountRef.current > 0 && onResync) {
            if (DEV) console.log('[Collab] remote OP_APPLIED with local pending -> resync');
            onResync();
          }
          if (ev.op?.type === 'SNAPSHOT_UPDATE' && ev.op?.payload?.nextSnapshot) {
            onRemoteUpdate?.(ev.op.payload.nextSnapshot);
          }
        }
        if (ev.type === 'OP_REJECTED') {
          if (ev.reason === 'VERSION_MISMATCH') {
            if (DEV) console.log('[Collab] OP_REJECTED VERSION_MISMATCH -> resync');
            onResync?.();
          }
          if (ev.clientOpId) {
            sentOpIdsRef.current.delete(ev.clientOpId);
            pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
          }
        }
        if (ev.type === 'LOCKS_UPDATED') {
          setLocks(ev.locks ?? { cellLocks: {}, docLock: null });
        }
      },
    });
    clientRef.current = client;
    client.connect();
    client.joinDoc(documentId, 'edit');
    setConnected(client.connected);

    if (DEV) console.log('[Collab] join doc', documentId, 'token changed, reconnected');

    return () => {
      client.leaveDoc(documentId);
      client.disconnect();
      clientRef.current = null;
      setConnected(false);
      if (DEV) console.log('[Collab] leave doc', documentId);
    };
  }, [documentId, token, onRemoteUpdate, onResync]);

  const applyOp = useCallback(
    async (op: { type: string; payload: Record<string, any> }, currentVersion: number): Promise<boolean> => {
      const client = clientRef.current;
      if (!client?.connected) return false;
      const clientOpId = generateClientOpId();
      sentOpIdsRef.current.add(clientOpId);
      pendingCountRef.current += 1;
      try {
        await client.applyOp(documentId!, currentVersion, clientOpId, op);
        if (DEV) console.log('[Collab] OP_APPLIED', op.type, 'v', currentVersion + 1);
        return true;
      } catch (e) {
        if (DEV) console.log('[Collab] OP_REJECTED', (e as Error)?.message);
        return false;
      } finally {
        sentOpIdsRef.current.delete(clientOpId);
        pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
      }
    },
    [documentId],
  );

  return { connected, serverVersion, locks, applyOp };
}
