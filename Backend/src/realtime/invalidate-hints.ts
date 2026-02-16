/**
 * Canonical mapping: entityType + action → invalidate hints (module + queries).
 * Used by RealtimeEmitterService to build payload.invalidate.
 * If no mapping → return null → frontend falls back to invalidateAll().
 */

export type InvalidateHint = {
  module: 'supply' | 'estimate' | 'sales' | 'warehouses' | 'delivery' | 'finance' | 'admin' | 'common';
  queries: string[];
};

export /** STEP 6: Activity feed queries to invalidate when entities change. */
function activityQueries(params: { projectId?: number | null }): string[] {
  const q: string[] = ['activity:feed:global'];
  if (params.projectId != null) q.push(`activity:feed:project:${params.projectId}`);
  return q;
}

export function buildInvalidateHints(params: {
  entityType: string;
  entityId: string | number;
  projectId?: number | null;
  action: 'created' | 'changed' | 'deleted';
}): InvalidateHint | null {
  const { entityType, entityId, action } = params;
  const idStr = String(entityId);
  const actQ = activityQueries(params);

  switch (entityType) {
    // Supply
    case 'invoice':
      return {
        module: 'supply',
        queries: [
          'supply:invoices:list',
          `supply:invoices:detail:${idStr}`,
          'supply:to-pay:list',
          ...actQ,
        ],
      };
    case 'supply_order':
    case 'order':
      return {
        module: 'supply',
        queries: [
          'supply:orders:list',
          `supply:orders:detail:${idStr}`,
          ...actQ,
        ],
      };
    case 'supply_receipt':
    case 'receipt':
      return {
        module: 'supply',
        queries: [
          'supply:receipts:list',
          `supply:receipts:detail:${idStr}`,
        ],
      };
    case 'supply_request':
      return {
        module: 'supply',
        queries: [
          'supply:requests:list',
          `supply:requests:detail:${idStr}`,
        ],
      };
    case 'supply_payable':
    case 'payable':
      return {
        module: 'supply',
        queries: [
          'supply:payables:list',
          `supply:payables:detail:${idStr}`,
          'supply:to-pay:list',
        ],
      };
    case 'supply_material':
    case 'material':
      return {
        module: 'supply',
        queries: [
          'supply:materials:list',
          `supply:materials:detail:${idStr}`,
        ],
      };

    // Estimate
    case 'act':
      return {
        module: 'estimate',
        queries: [
          'estimate:acts:list',
          `estimate:acts:detail:${idStr}`,
          ...actQ,
        ],
      };
    case 'quote':
    case 'estimate':
      return {
        module: 'estimate',
        queries: [
          'estimate:quotes:list',
          `estimate:quotes:detail:${idStr}`,
        ],
      };
    case 'stage':
      return {
        module: 'estimate',
        queries: [
          'estimate:stages:list',
        ],
      };

    // Warehouses
    case 'warehouse_movement':
    case 'movement':
      return {
        module: 'warehouses',
        queries: [
          'warehouse:movements:list',
          `warehouse:movements:detail:${idStr}`,
        ],
      };
    case 'warehouse':
      return {
        module: 'warehouses',
        queries: [
          'warehouses:list',
          `warehouses:detail:${idStr}`,
        ],
      };

    // Sales
    case 'client':
      return {
        module: 'sales',
        queries: [
          'sales:clients:list',
          `sales:clients:detail:${idStr}`,
          ...actQ,
        ],
      };
    case 'object':
    case 'project':
      return {
        module: 'sales',
        queries: [
          'sales:projects:list',
          `sales:projects:detail:${idStr}`,
          ...actQ,
        ],
      };
    case 'deal':
      return {
        module: 'sales',
        queries: [
          'sales:deals:list',
          `sales:deals:detail:${idStr}`,
        ],
      };

    // Delivery
    case 'work_log':
    case 'delivery_work_log':
      return {
        module: 'delivery',
        queries: [
          params.projectId ? `delivery:worklogs:${params.projectId}` : 'delivery:worklogs:list',
        ],
      };
    case 'delivery_act':
      return {
        module: 'delivery',
        queries: [
          'delivery:acts:list',
          `delivery:acts:detail:${idStr}`,
        ],
      };

    // Finance
    case 'transaction':
      return {
        module: 'finance',
        queries: [
          'finance:transactions:list',
          params.projectId ? `finance:transactions:project:${params.projectId}` : null,
        ].filter(Boolean) as string[],
      };
    case 'wallet':
      return {
        module: 'finance',
        queries: [
          'finance:wallets:list',
          `finance:wallets:detail:${idStr}`,
        ],
      };

    // Documents
    case 'document':
      return {
        module: 'common',
        queries: [
          'documents:list',
          `documents:detail:${idStr}`,
        ],
      };

    // Default: no hints → frontend fallback to invalidateAll()
    default:
      return null;
  }
}

/** Patch for frontend cache (STEP 3). merge = shallow merge fields; delete = remove from cache; create = add snapshot. */
export type RealtimePatchPayload = {
  op: 'merge' | 'delete' | 'create';
  fields?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
};

/**
 * Build patch payload for key entities (act, invoice, order).
 * Services pass saved entity snapshot; we extract list-friendly fields.
 */
export function buildPatchForEntity(
  entityType: string,
  action: 'created' | 'changed' | 'deleted',
  entity: Record<string, unknown>,
): RealtimePatchPayload | null {
  const updatedAt = entity?.updatedAt instanceof Date ? (entity.updatedAt as Date).toISOString() : (entity?.updatedAt as string | undefined);

  if (action === 'deleted') {
    return { op: 'delete' };
  }

  const fields: Record<string, unknown> = {};
  if (updatedAt != null) fields.updatedAt = updatedAt;

  switch (entityType) {
    case 'act':
      if (entity.status != null) fields.status = entity.status;
      if (entity.actDate != null) fields.actDate = entity.actDate;
      if (entity.projectId != null) fields.projectId = entity.projectId;
      return {
        op: action === 'created' ? 'create' : 'merge',
        fields: Object.keys(fields).length ? fields : undefined,
        snapshot: action === 'created' ? { id: entity.id, projectId: entity.projectId, status: entity.status, actDate: entity.actDate, updatedAt } : undefined,
      };
    case 'invoice':
      if (entity.status != null) fields.status = entity.status;
      if (entity.total != null) fields.total = entity.total;
      if (entity.projectId != null) fields.projectId = entity.projectId;
      return {
        op: action === 'created' ? 'create' : 'merge',
        fields: Object.keys(fields).length ? fields : undefined,
        snapshot: action === 'created' ? { id: entity.id, projectId: entity.projectId, status: entity.status, total: entity.total, updatedAt } : undefined,
      };
    case 'supply_order':
    case 'order':
      if (entity.status != null) fields.status = entity.status;
      if (entity.total != null) fields.total = entity.total;
      return {
        op: action === 'created' ? 'create' : 'merge',
        fields: Object.keys(fields).length ? fields : undefined,
        snapshot: action === 'created' ? { id: entity.id, status: entity.status, total: entity.total, updatedAt } : undefined,
      };
    default:
      return null;
  }
}
