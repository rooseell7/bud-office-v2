/**
 * Server load on mount. Canonical sheet: src/sheet/**
 * Завантажує snapshot лише ОДИН раз при монтуванні — не на кожному рендері.
 * Інакше hydrate зі старим snapshot перетирає щойно введене значення.
 */

import { useEffect, useRef } from 'react';
import type { SheetAdapter } from '../adapters/types';

export type UseSheetServerLoadOptions = {
  adapter: SheetAdapter | null | undefined;
  onLoaded: (snapshot: import('../engine/types').SheetSnapshot, revision?: number) => void;
};

export function useSheetServerLoad(options: UseSheetServerLoadOptions) {
  const { adapter, onLoaded } = options;
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!adapter?.loadSnapshot) return;
    const key = adapter.getDraftKey?.() ?? adapter.loadSnapshot?.toString?.() ?? 'default';
    if (lastLoadedKeyRef.current === key) return;
    lastLoadedKeyRef.current = key;

    adapter.loadSnapshot().then((result) => {
      if (!result) return;
      const snapshot =
        result && typeof result === 'object' && 'snapshot' in result
          ? (result as { snapshot: import('../engine/types').SheetSnapshot }).snapshot
          : (result as import('../engine/types').SheetSnapshot);
      const revision =
        result && typeof result === 'object' && 'revision' in result
          ? (result as { revision?: number }).revision
          : undefined;
      if (snapshot && typeof snapshot === 'object') {
        onLoadedRef.current(snapshot, revision);
      }
    });
  }, [adapter]);
}
