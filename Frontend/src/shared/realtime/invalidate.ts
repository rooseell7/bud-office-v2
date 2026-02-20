/**
 * Maps canonical query keys (from backend invalidate hints) to React Query invalidate.
 * Fallback to invalidateAll() if key is unknown.
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate a single canonical query key.
 * Maps canonical keys to actual React Query keys/predicates.
 */
export function invalidateByCanonicalKey(queryClient: QueryClient, key: string): void {
  // Parse canonical key format: "module:entity:action" or "module:entity:action:id"
  const parts = key.split(':');
  if (parts.length < 2) {
    // Unknown format → fallback
    console.warn(`[invalidate] Unknown canonical key format: ${key}, using fallback`);
    queryClient.invalidateQueries();
    return;
  }

  const [module, entity, action, id] = parts;
  void module;
  void entity;
  void action;
  void id;

  // Map to React Query keys based on actual usage in the codebase
  // Adjust these predicates based on your actual query key structure
  switch (key) {
    // Supply
    case 'supply:invoices:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'invoices' && q.queryKey.length === 1 });
      break;
    case 'supply:orders:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'orders' && q.queryKey.length === 1 });
      break;
    case 'supply:receipts:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'receipts' && q.queryKey.length === 1 });
      break;
    case 'supply:requests:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'requests' && q.queryKey.length === 1 });
      break;
    case 'supply:payables:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'payables' && q.queryKey.length === 1 });
      break;
    case 'supply:to-pay:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'to-pay' || q.queryKey[0] === 'payables' });
      break;
    case 'supply:materials:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' && q.queryKey.length === 1 });
      break;

    // Estimate
    case 'estimate:acts:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'acts' && q.queryKey.length === 1 });
      break;
    case 'estimate:quotes:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'quotes' && q.queryKey.length === 1 });
      break;
    case 'estimate:stages:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'stages' && q.queryKey.length === 1 });
      break;

    // Warehouses
    case 'warehouses:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'warehouses' && q.queryKey.length === 1 });
      break;
    case 'warehouse:movements:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'movements' || q.queryKey[0] === 'warehouse-movements' });
      break;

    // Sales
    case 'sales:clients:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'clients' && q.queryKey.length === 1 });
      break;
    case 'sales:projects:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'projects' || q.queryKey[0] === 'objects' });
      break;
    case 'sales:deals:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'deals' && q.queryKey.length === 1 });
      break;

    // Delivery
    case 'delivery:acts:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'delivery-acts' || (q.queryKey[0] === 'acts' && q.queryKey.length > 1) });
      break;

    // Finance
    case 'finance:transactions:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'transactions' && q.queryKey.length === 1 });
      break;
    case 'finance:wallets:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'wallets' && q.queryKey.length === 1 });
      break;

    // Common
    case 'documents:list':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'documents' && q.queryKey.length === 1 });
      break;

    // STEP 6: Activity Feed
    case 'activity:feed:global':
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'activity-feed' });
      break;

    // Detail queries (with ID)
    default:
      if (key.includes(':detail:')) {
        const detailId = key.split(':detail:')[1];
        // Invalidate detail queries by matching ID in queryKey
        queryClient.invalidateQueries({
          predicate: (q) => {
            const keyStr = String(q.queryKey.join(':'));
            return keyStr.includes(detailId) || keyStr === key;
          },
        });
      } else if (key.startsWith('activity:feed:')) {
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'activity-feed' });
      } else if (key.includes(':project:')) {
        const projectId = key.split(':project:')[1];
        queryClient.invalidateQueries({
          predicate: (q) => {
            const keyStr = String(q.queryKey.join(':'));
            return keyStr.includes(projectId);
          },
        });
      } else if (key.includes(':worklogs:')) {
        const projectId = key.split(':worklogs:')[1];
        queryClient.invalidateQueries({
          predicate: (q) => {
            const keyStr = String(q.queryKey.join(':'));
            return keyStr.includes('worklogs') && keyStr.includes(projectId);
          },
        });
      } else if (key.includes(':balances:')) {
        const warehouseId = key.split(':balances:')[1];
        queryClient.invalidateQueries({
          predicate: (q) => {
            const keyStr = String(q.queryKey.join(':'));
            return keyStr.includes('balances') && keyStr.includes(warehouseId);
          },
        });
      } else {
        // Unknown key → fallback
        console.warn(`[invalidate] Unknown canonical key: ${key}, using fallback`);
        queryClient.invalidateQueries();
      }
      break;
  }
}

/**
 * Batch invalidate multiple canonical keys (deduplicated).
 */
export function invalidateBatch(queryClient: QueryClient, keys: string[]): void {
  const unique = Array.from(new Set(keys));
  for (const key of unique) {
    invalidateByCanonicalKey(queryClient, key);
  }
}
