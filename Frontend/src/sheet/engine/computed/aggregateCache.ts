/**
 * Cache for column aggregates. Canonical sheet: src/sheet/**
 */

const MAX_CACHE_SIZE = 200;

type CacheEntry = { value: number; version: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(
  funcName: string,
  colKey: string,
  startRow: number,
  endRow: number,
  version: number,
): string {
  return `${funcName}|${colKey}|${startRow}|${endRow}|${version}`;
}

export function getCached(
  funcName: string,
  colKey: string,
  startRow: number,
  endRow: number,
  version: number,
): number | undefined {
  const key = cacheKey(funcName, colKey, startRow, endRow, version);
  const entry = cache.get(key);
  if (!entry || entry.version !== version) return undefined;
  return entry.value;
}

export function setCached(
  funcName: string,
  colKey: string,
  startRow: number,
  endRow: number,
  version: number,
  value: number,
): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  const key = cacheKey(funcName, colKey, startRow, endRow, version);
  cache.set(key, { value, version });
}
