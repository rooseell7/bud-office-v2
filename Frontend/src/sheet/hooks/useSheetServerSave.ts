/**
 * Server autosave. Canonical persistence switch:
 * - collab.connected === true: persist via applyOp (WS) only, REST disabled
 * - collab.connected === false: persist via adapter.saveSnapshot (REST) only, WS disabled
 * Never both for the same change.
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

export type UseSheetServerSaveOptions = {
  state: SheetState;
  adapter: SheetAdapter | null | undefined;
  mode: 'edit' | 'readonly';
  onSaved?: (snapshot: import('../engine/types').SheetSnapshot) => void;
  /** When true: use WS only, REST disabled */
  collabConnected?: boolean;
  /** WS persist: (snapshot, prevSnapshot, baseVersion) => Promise<{revision}> */
  applyOpViaCollab?: (
    snapshot: import('../engine/types').SheetSnapshot,
    prevSnapshot: import('../engine/types').SheetSnapshot | null,
    baseVersion: number,
  ) => Promise<{ revision: number }>;
};

export function useSheetServerSave(options: UseSheetServerSaveOptions) {
  const {
    state,
    adapter,
    mode,
    onSaved,
    collabConnected = false,
    applyOpViaCollab,
  } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const revisionRef = useRef<number>(0);
  const lastSavedSnapshotRef = useRef<import('../engine/types').SheetSnapshot | null>(null);
  const dirtyWhileSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!adapter?.saveSnapshot && !applyOpViaCollab) {
      setStatus('idle');
      return;
    }
    if (mode === 'readonly') {
      setStatus('readonly');
      return;
    }

    const useWs = collabConnected && !!applyOpViaCollab;
    const useRest = !collabConnected && !!adapter?.saveSnapshot;

    if (!useWs && !useRest) {
      setStatus('idle');
      return;
    }

    const performSave = async () => {
      const currentState = stateRef.current;
      const snapshot = serialize(currentState);
      const prevSnapshot = lastSavedSnapshotRef.current;
      const baseVersion = revisionRef.current;

      setStatus('saving');
      setErrorMessage('');

      try {
        if (useWs) {
          const result = await applyOpViaCollab!(snapshot, prevSnapshot, baseVersion);
          revisionRef.current = result.revision;
          if (DEV) console.log('[Sheet] persisted via WS, v', result.revision);
        } else {
          const result = await adapter!.saveSnapshot!(
            snapshot,
            baseVersion,
            prevSnapshot ?? undefined,
          );
          revisionRef.current = result?.revision ?? revisionRef.current + 1;
          if (DEV) console.log('[Sheet] persisted via REST, v', revisionRef.current);
        }

        lastSavedSnapshotRef.current = snapshot;
        setStatus('saved');
        onSaved?.(snapshot);
        if (dirtyWhileSavingRef.current) {
          dirtyWhileSavingRef.current = false;
          timerRef.current = setTimeout(performSave, DEBOUNCE_MS);
        }
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
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
    };

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
