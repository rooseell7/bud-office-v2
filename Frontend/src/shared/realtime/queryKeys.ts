/**
 * Canonical query keys registry for realtime invalidate.
 * Maps canonical keys (from backend invalidate hints) to React Query invalidate predicates.
 */

export const BO_Q = {
  // Supply
  SUPPLY_INVOICES_LIST: 'supply:invoices:list',
  SUPPLY_INVOICE_DETAIL: (id: string | number) => `supply:invoices:detail:${id}`,
  SUPPLY_ORDERS_LIST: 'supply:orders:list',
  SUPPLY_ORDER_DETAIL: (id: string | number) => `supply:orders:detail:${id}`,
  SUPPLY_RECEIPTS_LIST: 'supply:receipts:list',
  SUPPLY_RECEIPT_DETAIL: (id: string | number) => `supply:receipts:detail:${id}`,
  SUPPLY_REQUESTS_LIST: 'supply:requests:list',
  SUPPLY_REQUEST_DETAIL: (id: string | number) => `supply:requests:detail:${id}`,
  SUPPLY_PAYABLES_LIST: 'supply:payables:list',
  SUPPLY_PAYABLE_DETAIL: (id: string | number) => `supply:payables:detail:${id}`,
  SUPPLY_TO_PAY_LIST: 'supply:to-pay:list',
  SUPPLY_MATERIALS_LIST: 'supply:materials:list',
  SUPPLY_MATERIAL_DETAIL: (id: string | number) => `supply:materials:detail:${id}`,

  // Estimate
  ESTIMATE_ACTS_LIST: 'estimate:acts:list',
  ESTIMATE_ACT_DETAIL: (id: string | number) => `estimate:acts:detail:${id}`,
  ESTIMATE_QUOTES_LIST: 'estimate:quotes:list',
  ESTIMATE_QUOTE_DETAIL: (id: string | number) => `estimate:quotes:detail:${id}`,
  ESTIMATE_STAGES_LIST: 'estimate:stages:list',

  // Warehouses
  WAREHOUSES_LIST: 'warehouses:list',
  WAREHOUSE_DETAIL: (id: string | number) => `warehouses:detail:${id}`,
  WAREHOUSE_MOVEMENTS_LIST: 'warehouse:movements:list',
  WAREHOUSE_MOVEMENT_DETAIL: (id: string | number) => `warehouse:movements:detail:${id}`,
  WAREHOUSE_BALANCES: (warehouseId: string | number) => `warehouse:balances:${warehouseId}`,

  // Sales
  SALES_CLIENTS_LIST: 'sales:clients:list',
  SALES_CLIENT_DETAIL: (id: string | number) => `sales:clients:detail:${id}`,
  SALES_PROJECTS_LIST: 'sales:projects:list',
  SALES_PROJECT_DETAIL: (id: string | number) => `sales:projects:detail:${id}`,
  SALES_DEALS_LIST: 'sales:deals:list',
  SALES_DEAL_DETAIL: (id: string | number) => `sales:deals:detail:${id}`,

  // Delivery
  DELIVERY_WORKLOGS: (projectId: string | number) => `delivery:worklogs:${projectId}`,
  DELIVERY_WORKLOGS_LIST: 'delivery:worklogs:list',
  DELIVERY_ACTS_LIST: 'delivery:acts:list',
  DELIVERY_ACT_DETAIL: (id: string | number) => `delivery:acts:detail:${id}`,

  // Finance
  FINANCE_TRANSACTIONS_LIST: 'finance:transactions:list',
  FINANCE_TRANSACTIONS_PROJECT: (projectId: string | number) => `finance:transactions:project:${projectId}`,
  FINANCE_WALLETS_LIST: 'finance:wallets:list',
  FINANCE_WALLET_DETAIL: (id: string | number) => `finance:wallets:detail:${id}`,

  // Common
  DOCUMENTS_LIST: 'documents:list',
  DOCUMENT_DETAIL: (id: string | number) => `documents:detail:${id}`,

  // STEP 6: Activity Feed
  ACTIVITY_FEED: (scope: string, projectId?: number, entityType?: string, entityId?: string) => {
    void scope;
    return projectId != null
      ? `activity:feed:project:${projectId}`
      : entityType && entityId
        ? `activity:feed:entity:${entityType}:${entityId}`
        : 'activity:feed:global';
  },
  ACTIVITY_FEED_GLOBAL: 'activity:feed:global',
  ACTIVITY_FEED_PROJECT: (projectId: number) => `activity:feed:project:${projectId}`,
  ACTIVITY_FEED_ENTITY: (entityType: string, entityId: string) =>
    `activity:feed:entity:${entityType}:${entityId}`,
} as const;
