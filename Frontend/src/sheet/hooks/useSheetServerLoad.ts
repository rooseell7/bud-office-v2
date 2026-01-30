/**
 * Server load on mount. Canonical sheet: src/sheet/**
 */

import { useEffect } from 'react';
import type { SheetAdapter } from '../adapters/types';

export type UseSheetServerLoadOptions = {
  adapter: SheetAdapter | null | undefined;
  onLoaded: (snapshot: import('../engine/types').SheetSnapshot) => void;
};

export function useSheetServerLoad(options: UseSheetServerLoadOptions) {
  const { adapter, onLoaded } = options;

  useEffect(() => {
    if (!adapter?.loadSnapshot) return;
    adapter.loadSnapshot().then((snapshot) => {
      if (snapshot && (snapshot.values?.length || Object.keys(snapshot.styles ?? {}).length)) {
        onLoaded(snapshot);
      }
    });
  }, [adapter, onLoaded]);
}
