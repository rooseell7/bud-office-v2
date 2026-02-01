/**
 * SaveOrchestrator — ACK-based persistence, event-driven batching.
 * - collabConnected: WS applyOp only
 * - !collabConnected: REST saveSnapshot only
 * - CLEAN only when server ACK/OK confirmed
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { serialize } from '../engine/serialize';
import type { SheetState } from '../engine/state';
import type { SheetSnapshot } from '../engine/types';
import type { SheetAdapter } from '../adapters/types';

const TRAILING_MS = 400;
const MAX_WAIT_MS = 2000;
const DEV = import.meta.env?.DEV ?? false;
const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_PERSIST') === '1';

export type PersistStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type PersistUiState = {
  status: PersistStatus;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  lastError: string | null;
  ackedRev: number;
  localRev: number;
};

export type UseSaveOrchestratorOptions = {
  state: SheetState;
  adapter: SheetAdapter | null | undefined;
  mode: 'edit' | 'readonly';
  collabConnected: boolean;
  applyOpViaCollab?: (
    snapshot: SheetSnapshot,
    prevSnapshot: SheetSnapshot | null,
    baseVersion: number,
  ) => Promise<{ revision: number }>;
  serverVersion: number;
  onServerVersion?: (v: number) => void;
  onSaved?: (snapshot: SheetSnapshot) => void;
};

export function useSaveOrchestrator(options: UseSaveOrchestratorOptions) {
  const {
    state,
    adapter,
    mode,
    collabConnected,
    applyOpViaCollab,
    serverVersion,
    onServerVersion,
    onSaved,
  } = options;

  const stateRef = useRef(state);
  stateRef.current = state;

  const localRevRef = useRef(0);
  const ackedRevRef = useRef(0);
  const lastSavedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStartRef = useRef<number>(0);
  const inFlightRef = useRef(false);

  const [uiState, setUiState] = useState<PersistUiState>({
    status: 'clean',
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    lastError: null,
    ackedRev: 0,
    localRev: 0,
  });

  const syncServerVersion = useCallback((v: number) => {
    ackedRevRef.current = Math.max(ackedRevRef.current, v);
    onServerVersion?.(v);
  }, [onServerVersion]);

  useEffect(() => {
    if (typeof serverVersion === 'number' && serverVersion >= 0) {
      ackedRevRef.current = Math.max(ackedRevRef.current, serverVersion);
    }
  }, [serverVersion]);

  const performFlush = useCallback(async () => {
    if (inFlightRef.current) return;
    const useWs = collabConnected && !!applyOpViaCollab;
    const useRest = !collabConnected && !!adapter?.saveSnapshot;
    if (!useWs && !useRest) return;
    if (mode === 'readonly') return;
    if (useWs && useRest) return;
    if (localRevRef.current <= ackedRevRef.current && useRest) return;

    inFlightRef.current = true;
    setUiState((s) => ({ ...s, status: 'saving', isSaving: true, lastError: null }));

    const currentState = stateRef.current;
    const snapshot = serialize(currentState);
    const baseVersion = ackedRevRef.current;
    const targetRev = localRevRef.current;

    try {
      if (useWs) {
        const result = await applyOpViaCollab!(snapshot, null, baseVersion);
        ackedRevRef.current = Math.max(ackedRevRef.current, result.revision);
        lastSavedAtRef.current = Date.now();
        onSaved?.(snapshot);
        if (DEBUG || DEV) console.log('[persist] ACK WS rev=', result.revision);
      } else {
        const result = await adapter!.saveSnapshot!(snapshot, baseVersion);
        const rev = result?.revision ?? ackedRevRef.current + 1;
        ackedRevRef.current = Math.max(ackedRevRef.current, rev);
        lastSavedAtRef.current = Date.now();
        onSaved?.(snapshot);
        if (DEBUG || DEV) console.log('[persist] OK REST rev=', rev);
      }
      onServerVersion?.(ackedRevRef.current);
      const isClean = ackedRevRef.current >= localRevRef.current;
      setUiState({
        status: isClean ? 'saved' : 'dirty',
        isDirty: !isClean,
        isSaving: false,
        lastSavedAt: lastSavedAtRef.current,
        lastError: null,
        ackedRev: ackedRevRef.current,
        localRev: localRevRef.current,
      });
      if (isClean) {
        setTimeout(() => {
          setUiState((s) => (s.status === 'saved' ? { ...s, status: 'clean' } : s));
        }, 2000);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setUiState((s) => ({
        ...s,
        status: 'error',
        isSaving: false,
        lastError: msg,
      }));
      if (DEBUG || DEV) console.log('[persist] error', msg);
    } finally {
      inFlightRef.current = false;
    }
  }, [
    collabConnected,
    applyOpViaCollab,
    adapter,
    mode,
    onSaved,
    onServerVersion,
  ]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const now = Date.now();
    if (!timerStartRef.current) timerStartRef.current = now;
    const elapsed = now - timerStartRef.current;

    const run = () => {
      timerRef.current = null;
      timerStartRef.current = 0;
      performFlush();
    };

    if (elapsed >= MAX_WAIT_MS) {
      run();
    } else {
      timerRef.current = setTimeout(run, Math.min(TRAILING_MS, MAX_WAIT_MS - elapsed));
    }
  }, [performFlush]);

  const onLocalChange = useCallback(
    (changeMeta?: { type?: string }) => {
      if (mode === 'readonly') return;
      localRevRef.current += 1;
      setUiState((s) => ({
        ...s,
        status: 'dirty',
        isDirty: true,
        localRev: localRevRef.current,
      }));
      if (DEBUG || DEV) console.log('[persist] LOCAL_CHANGE rev=', localRevRef.current, 'type=', changeMeta?.type);
      if (changeMeta?.type === 'COMMIT_EDIT') {
        void performFlush();
      } else {
        scheduleFlush();
      }
    },
    [mode, scheduleFlush, performFlush],
  );

  const flushNow = useCallback(
    async (reason?: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        timerStartRef.current = 0;
      }
      if (DEBUG || DEV) console.log('[persist] flushNow reason=', reason);
      await performFlush();
    },
    [performFlush],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getUiState = useCallback((): PersistUiState => ({
    status: uiState.status,
    isDirty: uiState.isDirty,
    isSaving: uiState.isSaving,
    lastSavedAt: uiState.lastSavedAt,
    lastError: uiState.lastError,
    ackedRev: ackedRevRef.current,
    localRev: localRevRef.current,
  }), [uiState]);

  if (DEV && typeof window !== 'undefined') {
    (window as any).__sheetPersistDebug = () => ({
      mode: collabConnected ? 'WS' : 'REST',
      collabConnected,
      localRev: localRevRef.current,
      ackedRev: ackedRevRef.current,
      inFlight: inFlightRef.current,
      lastSavedAt: lastSavedAtRef.current,
    });
  }

  return {
    onLocalChange,
    flushNow,
    getUiState,
    uiState,
    setLastSavedSnapshot: (_: SheetSnapshot | null) => {},
    setRevision: (v: number) => {
      ackedRevRef.current = Math.max(ackedRevRef.current, v);
    },
  };
}
