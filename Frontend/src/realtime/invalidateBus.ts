/**
 * Event bus for bo:invalidate — pages subscribe and refetch.
 * invalidateAll: on any server change, refetch everything (live everywhere).
 */

export type InvalidatePayload = {
  v?: number;
  eventId: number;
  eventType: string;
  entityType: string;
  entityId: string;
  projectId?: number | null;
  entityVersion?: number;
  updatedAt?: string;
  serverTs?: string;
  invalidate?: {
    module: 'supply' | 'estimate' | 'sales' | 'warehouses' | 'delivery' | 'finance' | 'admin' | 'common';
    queries: string[];
  } | null;
  patch?: { op: 'merge' | 'delete' | 'create'; fields?: Record<string, unknown>; snapshot?: Record<string, unknown> };
  ts?: string;
  hint?: { module?: string; queries?: string[] };
};

type Handler = (payload: InvalidatePayload) => void;
type InvalidateAllHandler = () => void;

const handlers = new Set<Handler>();
const invalidateAllHandlers = new Set<InvalidateAllHandler>();

export function subscribeInvalidate(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function subscribeInvalidateAll(handler: InvalidateAllHandler): () => void {
  invalidateAllHandlers.add(handler);
  return () => invalidateAllHandlers.delete(handler);
}

export function emitInvalidate(payload: InvalidatePayload): void {
  handlers.forEach((h) => {
    try {
      h(payload);
    } catch (e) {
      console.warn('[invalidateBus] handler error', e);
    }
  });
}

/** Call on every bo:invalidate so all list pages refetch (live everywhere). */
export function invalidateAll(): void {
  invalidateAllHandlers.forEach((h) => {
    try {
      h();
    } catch (e) {
      console.warn('[invalidateBus] invalidateAll handler error', e);
    }
  });
}
