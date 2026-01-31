/**
 * Column helpers. Canonical sheet: src/sheet/**
 */

import type { SheetColumn } from './types';
import type { SheetConfig } from '../configs/types';

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Build SheetColumn[] from config (for initial state / migration) */
export function buildColumnsFromConfig(config: Partial<SheetConfig>): SheetColumn[] {
  const headers = config.columnHeaders ?? [];
  const formats = config.columnFormats ?? [];
  const wrap = config.columnWrap ?? [];
  const keys = config.columnKeys ?? [];
  const computeds = config.columnComputeds ?? [];
  return headers.map((title, i) => {
    const comp = computeds[i];
    const editable = comp ? false : !(config.readonlyColumns ?? []).includes(i);
    return {
      id: `col-${i}`,
      title,
      key: keys[i] ?? (i < 26 ? String.fromCharCode(97 + i) : `col_${i}`),
      type: (formats[i] ?? 'text') as SheetColumn['type'],
      wrap: !!wrap[i],
      editable,
      computed: comp,
    };
  });
}

/** Create a new column with unique id (user-added: key = col_xxx) */
export function createColumn(
  title: string,
  opts?: { type?: SheetColumn['type']; wrap?: boolean },
): SheetColumn {
  return {
    id: uid(),
    title,
    key: `col_${Date.now().toString(36)}`,
    type: opts?.type ?? 'text',
    wrap: opts?.wrap ?? false,
    editable: true,
  };
}
