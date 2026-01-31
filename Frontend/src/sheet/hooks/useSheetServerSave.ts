/**
 * Server autosave. Canonical persistence switch:
 * - collab.connected === true: persist via applyOp (WS) only, REST disabled
 * - collab.connected === false: persist via adapter.saveSnapshot (REST) only, WS disabled
 * Never both. Hard block REST when collab connected.
 */

import { useEffect, useRef, useState } from 'react';
import { serialize } from '../engine/serialize';
import type { SheetState } from '../engine/state';
import type { SheetAdapter } from '../adapters/types';

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'readonly'
  | 'locked'
  | 'conflict';

const DEBOUNCE_MS = 1500;
const DEV = import.meta.env?.DEV ?? false;
const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_COLLAB') === '1';
const DEBUG_EDIT = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_EDIT') === '1';

export type UseSheetServerSaveOptions = {
  state: SheetState;
  adapter: SheetAdapter | null | undefined;
  mode: 'edit' | 'readonly';
  onSaved?: (snapshot: import('../engine/types').SheetSnapshot) => void;
  collabConnected?: boolean;
  applyOpViaCollab?: (
    snapshot: import('../engine/types').SheetSnapshot,
    prevSnapshot: import('../engine/types').SheetSnapshot | null,
    baseVersion: number,
  ) => Promise<{ revision: number }>;
  externalRevision?: number;
};

export function useSheetServerSave(options: UseSheetServerSaveOptions) {
  const {
    state,
    adapter,
    mode,
    onSaved,
    collabConnected = false,
    applyOpViaCollab,
    externalRevision,
  } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const revisionRef = useRef<number>(0);
  const lastSavedSnapshotRef = useRef<import('../engine/types').SheetSnapshot | null>(null);
  const dirtyWhileSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const collabConnectedRef = useRef(collabConnected);
  collabConnectedRef.current = collabConnected;
  const applyOpViaCollabRef = useRef(applyOpViaCollab);
  applyOpViaCollabRef.current = applyOpViaCollab;
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    if (typeof externalRevision === 'number' && externalRevision >= 0) {
      revisionRef.current = externalRevision;
    }
  }, [externalRevision]);

  useEffect(() => {
    if (!adapter?.saveSnapshot && !applyOpViaCollab) {
      setStatus('idle');
      return;
    }
    if (mode === 'readonly') {
      setStatus('readonly');
      return;
    }

    const performSave = async () => {
      const connected = collabConnectedRef.current;
      const applyOp = applyOpViaCollabRef.current;
      const ad = adapterRef.current;
      const useWs = connected && !!applyOp;
      const useRest = !connected && !!ad?.saveSnapshot;

      if (!useWs && !useRest) return;
      if (connected && !applyOp) return;
      if (connected && useRest) {
        if (DEV || DEBUG) console.log('[Sheet] blocked REST save because collabConnected=true');
        return;
      }

      const currentState = stateRef.current;
      const snapshot = serialize(currentState);
      const prevSnapshot = lastSavedSnapshotRef.current;
      const baseVersion = revisionRef.current;

      if (DEBUG) {
        const snapSize = JSON.stringify(snapshot).length;
        console.log('[Sheet] performSave useWs=', useWs, 'useRest=', useRest, 'baseVersion=', baseVersion, 'snapshotSize=', snapSize);
      }

      if (useWs) {
        setStatus('saving');
        setErrorMessage('');
        if (DEV || DEBUG || DEBUG_EDIT) {
          console.log('[edit] send op via WS', { baseVersion, opType: 'SNAPSHOT_UPDATE', snapshotRows: snapshot?.rawValues?.length });
        }
        try {
          const result = await applyOpViaCollabRef.current!(snapshot, prevSnapshot, baseVersion);
          revisionRef.current = result.revision;
          lastSavedSnapshotRef.current = snapshot;
          setStatus('saved');
          onSaved?.(snapshot);
          if (DEBUG) console.log('[Sheet] persisted via WS, v', result.revision);
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          if (DEV || DEBUG) console.log('[Sheet] save error (WS):', msg);
          if (msg === 'CONFLICT') {
            setStatus('conflict');
            setErrorMessage('Конфлікт версій');
          } else {
            setStatus('error');
            setErrorMessage(msg);
          }
        }
        if (dirtyWhileSavingRef.current) {
          dirtyWhileSavingRef.current = false;
          timerRef.current = setTimeout(performSave, DEBOUNCE_MS);
        }
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
        return;
      }

      if (useRest && !connected && adapterRef.current?.saveSnapshot) {
        setStatus('saving');
        setErrorMessage('');
        if (DEV || DEBUG || DEBUG_EDIT) {
          console.log('[save] REST saveSnapshot', { baseVersion, snapshotRows: snapshot?.rawValues?.length });
        }
        try {
          const result = await adapterRef.current.saveSnapshot!(
            snapshot,
            baseVersion,
            prevSnapshot ?? undefined,
          );
          revisionRef.current = result?.revision ?? revisionRef.current + 1;
          lastSavedSnapshotRef.current = snapshot;
          setStatus('saved');
          onSaved?.(snapshot);
          if (DEBUG) console.log('[Sheet] persisted via REST, v', revisionRef.current);
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          if (DEV || DEBUG) console.log('[Sheet] save error (REST):', msg);
          if (msg === 'CONFLICT') {
            setStatus('conflict');
            setErrorMessage('Конфлікт версій');
          } else if (msg.includes('423') || msg.includes('Locked')) {
            setStatus('locked');
          } else {
            setStatus('error');
            setErrorMessage(msg);
          }
        }
        if (dirtyWhileSavingRef.current) {
          dirtyWhileSavingRef.current = false;
          timerRef.current = setTimeout(performSave, DEBOUNCE_MS);
        }
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      }
    };

    const useWs = collabConnected && !!applyOpViaCollab;
    const useRest = !collabConnected && !!adapter?.saveSnapshot;
    if (!useWs && !useRest) {
      setStatus('idle');
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (status === 'saving') {
      dirtyWhileSavingRef.current = true;
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      performSave();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    state.values,
    state.cellStyles,
    adapter,
    mode,
    status,
    collabConnected,
    applyOpViaCollab,
    externalRevision,
  ]);

  return {
    status,
    errorMessage,
    setLastSavedSnapshot: (s: import('../engine/types').SheetSnapshot | null) => {
      lastSavedSnapshotRef.current = s;
    },
    setRevision: (v: number) => {
      revisionRef.current = v;
    },
  };
}
