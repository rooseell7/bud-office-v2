/**
 * Patch engine (STEP 3): apply server patch to client cache when possible; otherwise fall back to invalidate.
 */

import type { QueryClient } from '@tanstack/react-query';
import {
  getPatchHandler,
  applyMergeToList,
  applyMergeToDetail,
  applyDeleteFromList,
  applyCreateToList,
  type PatchPayload,
} from './patchRegistry';

export type BoInvalidatePayload = {
  v?: number;
  eventId: number;
  eventType: string;
  entityType: string;
  entityId: string;
  projectId?: number | null;
  entityVersion?: number;
  updatedAt?: string;
  serverTs?: string;
  invalidate?: { module: string; queries: string[] };
  patch?: PatchPayload;
  ts?: string;
};

/**
 * Check if cached version is newer (avoid out-of-order).
 */
function isCachedNewer(
  queryClient: QueryClient,
  listKey: unknown[],
  detailKey: unknown[],
  entityId: string,
  entityVersion?: number,
  updatedAt?: string,
  idField: string = 'id',
): boolean {
  if (entityVersion != null) {
    const list = queryClient.getQueryData(listKey) as any[] | undefined;
    if (Array.isArray(list)) {
      const item = list.find((x: any) => String(x?.[idField]) === String(entityId));
      if (item?.entityVersion != null && item.entityVersion >= entityVersion) return true;
    }
    const detail = queryClient.getQueryData(detailKey) as any;
    if (detail?.entityVersion != null && detail.entityVersion >= entityVersion) return true;
  }
  if (updatedAt) {
    const list = queryClient.getQueryData(listKey) as any[] | undefined;
    if (Array.isArray(list)) {
      const item = list.find((x: any) => String(x?.[idField]) === String(entityId));
      if (item?.updatedAt && new Date(item.updatedAt) >= new Date(updatedAt)) return true;
    }
    const detail = queryClient.getQueryData(detailKey) as any;
    if (detail?.updatedAt && new Date(detail.updatedAt) >= new Date(updatedAt)) return true;
  }
  return false;
}

/**
 * Try to apply patch to cache. Returns true if patch was applied, false if fallback to invalidate.
 */
export function applyPatch(
  queryClient: QueryClient | null,
  payload: BoInvalidatePayload,
): { applied: boolean; invalidateKeys: string[] } {
  const invalidateKeys = payload.invalidate?.queries ?? [];
  if (!queryClient || !payload.patch) {
    return { applied: false, invalidateKeys };
  }

  const handler = getPatchHandler(payload.entityType);
  if (!handler) {
    return { applied: false, invalidateKeys };
  }

  const listKey = handler.listQueryKey;
  const detailKey = handler.detailQueryKey(payload.entityId);
  const idField = (handler.idField ?? 'id') as string;

  // Out-of-order: ignore if cache already has newer data
  if (
    (payload.entityVersion != null || payload.updatedAt) &&
    isCachedNewer(
      queryClient,
      listKey,
      detailKey,
      payload.entityId,
      payload.entityVersion,
      payload.updatedAt,
      idField,
    )
  ) {
    return { applied: true, invalidateKeys: [] };
  }

  const { op, fields, snapshot } = payload.patch;

  try {
    if (op === 'merge' && fields) {
      const listApplied = applyMergeToList(queryClient, listKey, payload.entityId, fields, idField);
      const detailApplied = applyMergeToDetail(queryClient, detailKey, fields);
      return { applied: listApplied || detailApplied, invalidateKeys: listApplied && detailApplied ? [] : invalidateKeys };
    }
    if (op === 'delete') {
      const applied = applyDeleteFromList(queryClient, listKey, payload.entityId, idField, detailKey);
      return { applied, invalidateKeys: applied ? [] : invalidateKeys };
    }
    if (op === 'create' && snapshot) {
      const applied = applyCreateToList(queryClient, listKey, snapshot);
      return { applied, invalidateKeys: applied ? [] : invalidateKeys };
    }
  } catch (e) {
    console.warn('[patchEngine] apply failed', e);
  }
  return { applied: false, invalidateKeys };
}
