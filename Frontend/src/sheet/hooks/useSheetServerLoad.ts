/**
 * Server load on mount. Canonical sheet: src/sheet/**
 */

import { useEffect } from 'react';
import type { SheetAdapter } from '../adapters/types';

export type UseSheetServerLoadOptions = {
  adapter: SheetAdapter | null | undefined;
  onLoaded: (snapshot: import('../engine/types').SheetSnapshot, revision?: number) => void;
};

export function useSheetServerLoad(options: UseSheetServerLoadOptions) {
  const { adapter, onLoaded } = options;

  useEffect(() => {
    if (!adapter?.loadSnapshot) return;
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
      if (snapshot && (snapshot.values?.length || Object.keys(snapshot.styles ?? {}).length)) {
        onLoaded(snapshot, revision);
      }
    });
  }, [adapter, onLoaded]);
}
