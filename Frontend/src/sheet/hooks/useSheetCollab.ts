/**
 * Collab WebSocket integration. JOIN_DOC on mount, apply ops via WS when connected.
 * localVersion = serverVersion ONLY from server (DOC_STATE, OP_APPLIED, loadSnapshot).
 * Never self-increment. Token from AuthContext.
 *
 * CollabClient/wsBaseUrl завантажуються динамічно — уникнення циклічної залежності при init.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SheetSnapshot } from '../engine/types';
import type { CollabClient, CollabEvent } from '../collab/collabClient';

const DEV = import.meta.env?.DEV ?? false;
const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_COLLAB') === '1';

function generateClientOpId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export type UseSheetCollabOptions = {
  documentId: number | null;
  token: string | null;
  onRemoteUpdate?: (snapshot: SheetSnapshot, version?: number) => void;
  /** Resync: load server snapshot, hydrate, returns new revision. We set serverVersion from it. */
  onResync?: () => Promise<number | void>;
  onDocState?: (version: number) => void;
  /** Синхронне оновлення ref при зміні pending (для guard hydrate під час commit). */
  hasPendingOpsRef?: React.MutableRefObject<boolean>;
};

export function useSheetCollab(options: UseSheetCollabOptions) {
  const { documentId, token, onRemoteUpdate, onResync, onDocState, hasPendingOpsRef } = options;
  const [serverVersion, setServerVersion] = useState(0);
  const [hasPendingOps, setHasPendingOps] = useState(false);
  const [locks, setLocks] = useState<{ cellLocks: Record<string, number>; docLock: number | null }>({
    cellLocks: {},
    docLock: null,
  });
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<CollabClient | null>(null);
  const pendingCountRef = useRef(0);
  const sentOpIdsRef = useRef<Set<string>>(new Set());
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;
  const lastDocStateVersionRef = useRef(0);
  const lastDocStateSocketIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!documentId || !token) return;

    let cancelled = false;

    void (async () => {
      const { CollabClient: CollabClientClass } = await import('../collab/collabClient');
      const { wsBaseUrl } = await import('../collab/env');
      if (cancelled) return;

      const client = new CollabClientClass({
        url: wsBaseUrl,
        token,
        joinDocOnConnect: { docId: documentId, mode: 'edit' },
        onEvent: (ev: CollabEvent) => {
        if (ev.type === 'DOC_STATE') {
          const socketId = client.socketId ?? null;
          const v = ev.version ?? 0;
          if (v === lastDocStateVersionRef.current && socketId === lastDocStateSocketIdRef.current) {
            if (DEBUG) console.debug('[collab] DOC_STATE duplicate version/socket, skip heavy');
            return;
          }
          lastDocStateVersionRef.current = v;
          lastDocStateSocketIdRef.current = socketId;
          setServerVersion(v);
          setLocks(ev.locks ?? { cellLocks: {}, docLock: null });
          setConnected(true);
          onDocState?.(v);
          if (DEV || DEBUG) {
            console.log('[collab] DOC_STATE docId=', ev.docId, 'serverVersion=', v);
          }
        }
        if (ev.type === 'OP_APPLIED') {
          const isOwn = ev.clientOpId ? sentOpIdsRef.current.has(ev.clientOpId) : false;
          setServerVersion(ev.version ?? 0);
          if (ev.clientOpId && isOwn) {
            sentOpIdsRef.current.delete(ev.clientOpId);
            pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
            const nextPending = pendingCountRef.current > 0;
            hasPendingOpsRef && (hasPendingOpsRef.current = nextPending);
            setHasPendingOps(nextPending);
          } else if (ev.clientOpId && !isOwn && pendingCountRef.current > 0 && onResyncRef.current) {
            if (DEV || DEBUG) console.log('[collab] remote OP_APPLIED with local pending -> resync');
            onResyncRef.current().then((rev) => {
              if (typeof rev === 'number') setServerVersion(rev);
            });
          }
          // Лише remote ops — не hydrate власний op (вже маємо state, hydrate спричиняв цикл save→OP_APPLIED→hydrate→save)
          if (ev.op?.type === 'SNAPSHOT_UPDATE' && ev.op?.payload?.nextSnapshot && !isOwn) {
            onRemoteUpdate?.(ev.op.payload.nextSnapshot, ev.version);
          }
          if (DEBUG) {
            console.log('[collab] OP_APPLIED docId=', ev.docId, 'serverVersion=', ev.version, 'clientOpId=', ev.clientOpId?.slice(0, 8), 'isOwn=', isOwn);
          }
        }
        if (ev.type === 'OP_REJECTED') {
          if (ev.clientOpId) {
            sentOpIdsRef.current.delete(ev.clientOpId);
            pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
            const nextPending = pendingCountRef.current > 0;
            hasPendingOpsRef && (hasPendingOpsRef.current = nextPending);
            setHasPendingOps(nextPending);
          }
          if (ev.reason === 'VERSION_MISMATCH') {
            if (DEV || DEBUG) console.log('[collab] OP_REJECTED VERSION_MISMATCH -> resync', ev.details);
            onResyncRef.current?.().then((rev) => {
              if (typeof rev === 'number') setServerVersion(rev);
            });
          } else if (DEV || DEBUG) {
            console.log('[collab] OP_REJECTED reason=', ev.reason, 'details=', ev.details);
          }
        }
        if (ev.type === 'LOCKS_UPDATED') {
          setLocks(ev.locks ?? { cellLocks: {}, docLock: null });
        }
      },
    });

      clientRef.current = client;
      client.connect();
      setConnected(client.connected);

      if (DEBUG) console.log('[collab] connect initiated, joinDoc will run on connect', documentId);
    })();

    return () => {
      cancelled = true;
      const c = clientRef.current;
      if (c) {
        c.leaveDoc(documentId);
        c.disconnect();
        clientRef.current = null;
        setConnected(false);
        if (DEBUG) console.log('[collab] leave doc', documentId);
      }
    };
  }, [documentId, token, onRemoteUpdate]);

  const applyOp = useCallback(
    async (
      op: { type: string; payload: Record<string, any> },
      baseVersion: number,
    ): Promise<{ ok: true; version: number } | { ok: false }> => {
      const client = clientRef.current;
      if (!client?.connected) return { ok: false };
      const clientOpId = generateClientOpId();
      sentOpIdsRef.current.add(clientOpId);
      pendingCountRef.current += 1;
      hasPendingOpsRef && (hasPendingOpsRef.current = true);
      setHasPendingOps(true);
      if (DEV || DEBUG || (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_EDIT') === '1')) {
        console.log('[collab] sendOp -> ws', { docId: documentId, baseVersion, clientOpId: clientOpId.slice(0, 8), opType: op.type });
      }
      try {
        const version = await client.applyOp(documentId!, baseVersion, clientOpId, op);
        if (DEBUG) {
          console.log('[collab] sendOp baseVersion=', baseVersion, 'clientOpId=', clientOpId.slice(0, 8), 'opSummary=', op.type, '-> serverVersion=', version);
        }
        return { ok: true, version };
      } catch (e) {
        if (DEV || DEBUG) console.log('[collab] sendOp rejected', (e as Error)?.message);
        return { ok: false };
      }
    },
    [documentId],
  );

  if (DEV || DEBUG) {
    (window as any).__collabDebug = () => ({
      docId: documentId,
      socketId: clientRef.current?.socketId ?? null,
      collabConnected: connected,
      localVersion: serverVersion,
      serverVersion,
      pendingOps: pendingCountRef.current,
    });
  }

  return { connected, serverVersion, hasPendingOps, locks, applyOp };
}
