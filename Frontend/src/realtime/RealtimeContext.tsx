/**
 * Realtime context: single WS connection for domain events, subscribe + join/leave rooms.
 * Does not touch sheet/collab. Uses same WS URL + JWT as sheet.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RealtimeClient } from './realtimeClient';
import type { DomainEvent } from './types';

const DEBOUNCE_MS = 400;

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

type RealtimeContextValue = {
  subscribe: (handler: (ev: DomainEvent) => void) => () => void;
  refetchOnReconnect: (fn: () => void) => () => void;
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  joinModule: (module: 'execution' | 'finance') => void;
  leaveModule: (module: 'execution' | 'finance') => void;
  connected: boolean;
  connectionStatus: ConnectionStatus;
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
}: {
  children: React.ReactNode;
  token: string | null;
}) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const clientRef = useRef<RealtimeClient | null>(null);
  const handlersRef = useRef<Set<(ev: DomainEvent) => void>>(new Set());
  const reconnectRef = useRef<Set<() => void>>(new Set());
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
      onEvent: (ev) => {
        lastEv = ev;
        flush();
      },
      onConnect: () => {
        setReconnecting(false);
        setConnected(true);
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
  }, [token]);

  const connectionStatus: ConnectionStatus = connected ? 'connected' : reconnecting ? 'reconnecting' : 'offline';
  const value: RealtimeContextValue = {
    subscribe,
    refetchOnReconnect,
    joinProject,
    leaveProject,
    joinModule,
    leaveModule,
    connected,
    connectionStatus,
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
