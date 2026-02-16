/**
 * Registry of patch handlers per entity type (STEP 3).
 * Describes how to update list/detail caches for merge/delete/create.
 */

import type { QueryClient } from '@tanstack/react-query';

export type PatchPayload = {
  op: 'merge' | 'delete' | 'create';
  fields?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
};

export type PatchHandler = {
  listQueryKey: unknown[];
  detailQueryKey: (id: string) => unknown[];
  idField?: string;
};

const registry = new Map<string, PatchHandler>();

function register(entityType: string, handler: PatchHandler): void {
  registry.set(entityType, handler);
}

// Act: list key ['acts'], detail ['acts', id]
register('act', {
  listQueryKey: ['acts'],
  detailQueryKey: (id) => ['acts', id],
  idField: 'id',
});

// Invoice: list ['invoices'], detail ['invoices', id]
register('invoice', {
  listQueryKey: ['invoices'],
  detailQueryKey: (id) => ['invoices', id],
  idField: 'id',
});

// Order: list ['orders'], detail ['orders', id]
register('order', {
  listQueryKey: ['orders'],
  detailQueryKey: (id) => ['orders', id],
  idField: 'id',
});
register('supply_order', {
  listQueryKey: ['orders'],
  detailQueryKey: (id) => ['orders', id],
  idField: 'id',
});

export function getPatchHandler(entityType: string): PatchHandler | undefined {
  return registry.get(entityType);
}

/**
 * Apply merge to list cache: find item by id, shallow merge fields.
 */
export function applyMergeToList(
  queryClient: QueryClient,
  listKey: unknown[],
  entityId: string,
  fields: Record<string, unknown>,
  idField: string = 'id',
): boolean {
  const current = queryClient.getQueryData(listKey);
  if (!Array.isArray(current)) return false;
  const idVal = entityId;
  const idx = current.findIndex((item: any) => String(item?.[idField]) === String(idVal));
  if (idx < 0) return false;
  const next = [...current];
  next[idx] = { ...next[idx], ...fields };
  queryClient.setQueryData(listKey, next);
  return true;
}

/**
 * Apply merge to detail cache.
 */
export function applyMergeToDetail(
  queryClient: QueryClient,
  detailKey: unknown[],
  fields: Record<string, unknown>,
): boolean {
  const current = queryClient.getQueryData(detailKey);
  if (current == null || typeof current !== 'object') return false;
  queryClient.setQueryData(detailKey, { ...current, ...fields });
  return true;
}

/**
 * Apply delete: remove from list cache.
 */
export function applyDeleteFromList(
  queryClient: QueryClient,
  listKey: unknown[],
  entityId: string,
  idField: string = 'id',
  detailKey?: unknown[],
): boolean {
  const current = queryClient.getQueryData(listKey);
  if (!Array.isArray(current)) return false;
  const next = current.filter((item: any) => String(item?.[idField]) !== String(entityId));
  if (next.length === current.length) return false;
  queryClient.setQueryData(listKey, next);
  if (detailKey) queryClient.removeQueries({ queryKey: detailKey });
  return true;
}

/**
 * Apply create: add snapshot to top of list cache.
 */
export function applyCreateToList(
  queryClient: QueryClient,
  listKey: unknown[],
  snapshot: Record<string, unknown>,
): boolean {
  const current = queryClient.getQueryData(listKey);
  const list = Array.isArray(current) ? current : [];
  const id = snapshot?.id;
  if (id != null && list.some((item: any) => String(item?.id) === String(id))) return true; // already present
  queryClient.setQueryData(listKey, [snapshot, ...list]);
  return true;
}

export { register };
