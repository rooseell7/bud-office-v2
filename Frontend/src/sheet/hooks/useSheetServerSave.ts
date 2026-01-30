/**
 * Server autosave. Canonical sheet: src/sheet/**
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

export type UseSheetServerSaveOptions = {
  state: SheetState;
  adapter: SheetAdapter | null | undefined;
  mode: 'edit' | 'readonly';
};

export function useSheetServerSave(options: UseSheetServerSaveOptions) {
  const { state, adapter, mode } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const revisionRef = useRef<number>(0);
  const dirtyWhileSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!adapter?.saveSnapshot) {
      setStatus('idle');
      return;
    }
    if (mode === 'readonly') {
      setStatus('readonly');
      return;
    }

    const performSave = async () => {
      const currentState = stateRef.current;
      if (!adapter?.saveSnapshot) return;
      setStatus('saving');
      setErrorMessage('');
      try {
        const snapshot = serialize(currentState);
        const result = await adapter.saveSnapshot(snapshot, revisionRef.current);
        revisionRef.current = result?.revision ?? revisionRef.current + 1;
        setStatus('saved');
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
  }, [state.values, state.cellStyles, adapter, mode, status]);

  return { status, errorMessage };
}
