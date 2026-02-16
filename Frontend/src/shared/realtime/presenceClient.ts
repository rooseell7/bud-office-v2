/**
 * STEP 4: Helpers for presence context from route.
 * Call sendPresenceHello(context) when route changes; build context from pathname/params.
 */

export type PresenceContext = {
  module?: string | null;
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | number | null;
  route?: string | null;
  mode?: 'view' | 'edit';
};

/**
 * Derive module from pathname (e.g. /estimate/acts -> estimate, /supply/orders -> supply).
 */
export function getModuleFromPath(pathname: string): string | null {
  const p = pathname.replace(/^\/+/, '').split('/')[0] ?? '';
  const map: Record<string, string> = {
    estimate: 'estimate',
    supply: 'supply',
    delivery: 'delivery',
    sales: 'sales',
    finance: 'finance',
    warehouse: 'warehouses',
    warehouses: 'warehouses',
    execution: 'execution',
    invoices: 'supply',
  };
  return (map[p] ?? p) || null;
}

/**
 * Parse pathname + params to build presence context.
 * Examples:
 *   /estimate/acts -> { module: 'estimate', entityType: 'act', route }
 *   /estimate/acts/12 -> { module: 'estimate', entityType: 'act', entityId: '12', route }
 *   /estimate/123 -> { module: 'estimate', projectId: 123, route }
 *   /supply/invoices/5 -> { module: 'supply', entityType: 'invoice', entityId: '5', route }
 */
export function buildPresenceContext(
  pathname: string,
  searchParams?: URLSearchParams,
  mode: 'view' | 'edit' = 'view',
): PresenceContext {
  const route = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
  const module = getModuleFromPath(pathname) ?? null;
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

  let projectId: number | null = null;
  let entityType: string | null = null;
  let entityId: string | number | null = null;

  // /estimate/123, /estimate/123/...
  if (segments[0] === 'estimate' && segments[1] && /^\d+$/.test(segments[1])) {
    projectId = parseInt(segments[1], 10);
  }
  // /delivery/acts, /estimate/acts, /estimate/acts/12
  if (segments[1] === 'acts') {
    entityType = 'act';
    if (segments[2] && /^\d+$/.test(segments[2])) entityId = segments[2];
  }
  // /supply/invoices, /supply/invoices/5
  if (segments[1] === 'invoices') {
    entityType = 'invoice';
    if (segments[2]) entityId = segments[2];
  }
  // /supply/orders, /supply/orders/7
  if (segments[1] === 'orders') {
    entityType = 'order';
    if (segments[2] && /^\d+$/.test(segments[2])) entityId = segments[2];
  }
  // /invoices/5 (legacy)
  if (segments[0] === 'invoices' && segments[1]) {
    entityType = 'invoice';
    entityId = segments[1];
  }
  // objectId from query
  const objectId = searchParams?.get('objectId');
  if (objectId && /^\d+$/.test(objectId)) {
    if (!projectId) projectId = parseInt(objectId, 10);
  }

  return {
    module,
    projectId: projectId ?? null,
    entityType,
    entityId,
    route,
    mode,
  };
}
