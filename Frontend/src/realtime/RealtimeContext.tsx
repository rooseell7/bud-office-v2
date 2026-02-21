/**
 * Realtime context: domain events + bo:invalidate (outbox). Resync on reconnect.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RealtimeClient } from './realtimeClient';
import type { DomainEvent } from './types';
import {
  subscribeInvalidate as subInvalidate,
  subscribeInvalidateAll as subInvalidateAll,
  emitInvalidate,
  type InvalidatePayload,
} from './invalidateBus';
import { apiBaseUrl } from '../shared/config/env';
import { invalidateBatch } from '../shared/realtime/invalidate';
import { applyPatch } from '../shared/realtime/patchEngine';
import { invalidateAll } from './invalidateBus';
import {
  reducePresenceState,
  emptyPresenceState,
  type PresenceState,
} from '../shared/realtime/usePresence';
import type { PresenceStatePayload, EditStatePayload } from './realtimeClient';

const DEBOUNCE_MS = 400;
const INVALIDATE_DEBOUNCE_MS = 200; // Batch invalidate queries within 200ms
const LS_LAST_EVENT_ID = 'bud.realtime.lastEventId';

declare const require: (id: string) => any;

// Try to get React Query client (optional)
let queryClient: any = null;
try {
  // Dynamic import to avoid breaking if React Query not used
  const reactQuery = require('@tanstack/react-query');
  if (reactQuery.useQueryClient) {
    // Will be set by a hook that uses useQueryClient
    queryClient = null; // Set via setQueryClient
  }
} catch {
  // React Query not available
}

export function setQueryClient(qc: any): void {
  queryClient = qc;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export type EditingUser = { userId: number; name: string; initials?: string; startedAt: number; lastSeenAt: number };
export type EditState = Record<string, EditingUser[]>;

type RealtimeContextValue = {
  subscribe: (handler: (ev: DomainEvent) => void) => () => void;
  subscribeInvalidate: (handler: (payload: import('./invalidateBus').InvalidatePayload) => void) => () => void;
  subscribeInvalidateAll: (handler: () => void) => () => void;
  refetchOnReconnect: (fn: () => void) => () => void;
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  joinModule: (module: 'execution' | 'finance') => void;
  leaveModule: (module: 'execution' | 'finance') => void;
  joinBoRooms: (rooms: string[]) => void;
  leaveBoRooms: (rooms: string[]) => void;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  // STEP 4 presence
  presenceState: PresenceState;
  editState: EditState;
  sendPresenceHello: (context: {
    module?: string | null;
    projectId?: number | null;
    entityType?: string | null;
    entityId?: string | number | null;
    route?: string | null;
    mode?: 'view' | 'edit';
  }) => void;
  sendPresenceLeave: () => void;
  sendEditBegin: (entityType: string, entityId: string, projectId?: number) => void;
  sendEditEnd: (entityType: string, entityId: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

export function RealtimeProvider({
  children,
  token,
  userId,
}: {
  children: React.ReactNode;
  token: string | null;
  userId?: number | null;
}) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [presenceState, setPresenceState] = useState<PresenceState>(emptyPresenceState);
  const [editState, setEditState] = useState<EditState>({});
  const clientRef = useRef<RealtimeClient | null>(null);
  const handlersRef = useRef<Set<(ev: DomainEvent) => void>>(new Set());
  const reconnectRef = useRef<Set<() => void>>(new Set());
  const pendingInvalidateKeysRef = useRef<Set<string>>(new Set());
  const invalidateDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribe = useCallback((handler: (ev: DomainEvent) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const refetchOnReconnect = useCallback((fn: () => void) => {
    reconnectRef.current.add(fn);
    return () => {
      reconnectRef.current.delete(fn);
    };
  }, []);

  const joinProject = useCallback((projectId: number) => {
    clientRef.current?.joinProject(projectId);
  }, []);

  const leaveProject = useCallback((projectId: number) => {
    clientRef.current?.leaveProject(projectId);
  }, []);

  const joinModule = useCallback((module: 'execution' | 'finance') => {
    clientRef.current?.joinModule(module);
  }, []);

  const leaveModule = useCallback((module: 'execution' | 'finance') => {
    clientRef.current?.leaveModule(module);
  }, []);

  const joinBoRooms = useCallback((rooms: string[]) => {
    clientRef.current?.joinBoRooms(rooms);
  }, []);

  const leaveBoRooms = useCallback((rooms: string[]) => {
    clientRef.current?.leaveBoRooms(rooms);
  }, []);

  const sendPresenceHello = useCallback((context: Parameters<RealtimeContextValue['sendPresenceHello']>[0]) => {
    clientRef.current?.sendPresenceHello(context);
  }, []);
  const sendPresenceLeave = useCallback(() => clientRef.current?.sendPresenceLeave(), []);
  const sendEditBegin = useCallback(
    (entityType: string, entityId: string, projectId?: number) =>
      clientRef.current?.sendEditBegin(entityType, entityId, projectId),
    [],
  );
  const sendEditEnd = useCallback(
    (entityType: string, entityId: string) => clientRef.current?.sendEditEnd(entityType, entityId),
    [],
  );

  // Batch invalidate handler (debounced)
  const flushInvalidateBatch = useCallback(() => {
    if (pendingInvalidateKeysRef.current.size === 0) return;
    const keys = Array.from(pendingInvalidateKeysRef.current);
    pendingInvalidateKeysRef.current.clear();
    if (queryClient) {
      invalidateBatch(queryClient, keys);
    } else {
      // No React Query → fallback to invalidateAll
      invalidateAll();
    }
  }, []);

  const handleInvalidate = useCallback((payload: InvalidatePayload) => {
    // STEP 3: try patch first (no refetch when cache updated)
    const { applied, invalidateKeys } = applyPatch(queryClient, payload as any);
    if (applied && invalidateKeys.length === 0) {
      return; // patch applied, nothing to invalidate
    }
    const keysToInvalidate = invalidateKeys.length > 0 ? invalidateKeys : payload.invalidate?.queries ?? [];
    if (keysToInvalidate.length > 0) {
      keysToInvalidate.forEach((q) => pendingInvalidateKeysRef.current.add(q));
      if (invalidateDebounceTimerRef.current) clearTimeout(invalidateDebounceTimerRef.current);
      invalidateDebounceTimerRef.current = setTimeout(() => {
        invalidateDebounceTimerRef.current = null;
        flushInvalidateBatch();
      }, INVALIDATE_DEBOUNCE_MS);
    } else {
      invalidateAll();
    }
  }, [flushInvalidateBatch]);

  useEffect(() => {
    return subInvalidate(handleInvalidate);
  }, [handleInvalidate]);

  useEffect(() => {
    if (!token) return;
    let lastEv: DomainEvent | null = null;
    const flush = debounce(() => {
      if (lastEv) {
        handlersRef.current.forEach((h) => h(lastEv!));
        lastEv = null;
      }
    }, DEBOUNCE_MS);
    const client = new RealtimeClient({
      token,
      userId: userId ?? null,
      onEvent: (ev) => {
        lastEv = ev;
        flush();
      },
      onPresenceState: (payload: PresenceStatePayload) => {
        setPresenceState((prev) => reducePresenceState(prev, payload));
      },
      onEditState: (payload: EditStatePayload) => {
        setEditState((prev) => ({
          ...prev,
          [`${payload.entityType}:${payload.entityId}`]: payload.editors,
        }));
      },
      onConnect: async () => {
        setReconnecting(false);
        setConnected(true);
        const sinceId = parseInt(localStorage.getItem(LS_LAST_EVENT_ID) ?? '0', 10) || 0;
        if (sinceId > 0 && token) {
          try {
            const res = await fetch(
              `${apiBaseUrl}/realtime/sync?sinceEventId=${sinceId}&scopeType=global&limit=500`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const data = await res.json();
            const events = data?.events ?? [];
            let maxId = sinceId;
            for (const e of events) {
              if (e?.id) {
                maxId = Math.max(maxId, e.id);
                const syncPayload = {
                  eventId: e.id,
                  eventType: e.eventType ?? 'entity.changed',
                  entityType: e.entityType ?? '',
                  entityId: String(e.entityId ?? ''),
                  projectId: e.payload?.projectId ?? null,
                  invalidate: e.payload?.invalidate ?? undefined,
                  patch: e.payload?.patch ?? undefined,
                  entityVersion: e.payload?.entityVersion ?? undefined,
                  updatedAt: e.payload?.updatedAt ?? undefined,
                  ts: e.ts,
                };
                emitInvalidate(syncPayload);
                const { applied, invalidateKeys } = applyPatch(queryClient, syncPayload as any);
                if (!applied && invalidateKeys.length > 0) {
                  invalidateKeys.forEach((q) => pendingInvalidateKeysRef.current.add(q));
                } else if (!applied && (!syncPayload.invalidate?.queries || syncPayload.invalidate.queries.length === 0)) {
                  invalidateAll();
                } else if (!applied && syncPayload.invalidate?.queries) {
                  syncPayload.invalidate.queries.forEach((q: string) => pendingInvalidateKeysRef.current.add(q));
                }
              }
            }
            if (maxId > sinceId) localStorage.setItem(LS_LAST_EVENT_ID, String(maxId));
            // Flush any batched invalidates after sync
            if (pendingInvalidateKeysRef.current.size > 0) {
              flushInvalidateBatch();
            }
          } catch {
            /* ignore */
          }
        }
        setTimeout(() => reconnectRef.current.forEach((f) => f()), 100);
      },
      onDisconnect: () => {
        setConnected(false);
        setReconnecting(true);
      },
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [token, userId]);

  const connectionStatus: ConnectionStatus = connected ? 'connected' : reconnecting ? 'reconnecting' : 'offline';
  const value: RealtimeContextValue = {
    subscribe,
    subscribeInvalidate: subInvalidate,
    subscribeInvalidateAll: subInvalidateAll,
    refetchOnReconnect,
    joinProject,
    leaveProject,
    joinModule,
    leaveModule,
    joinBoRooms,
    leaveBoRooms,
    connected,
    connectionStatus,
    presenceState,
    editState,
    sendPresenceHello,
    sendPresenceLeave,
    sendEditBegin,
    sendEditEnd,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue | null {
  return useContext(RealtimeContext);
}
