import api from './api';

// --- Types (align with backend) ---
export interface SupplyRequestItemDto {
  id?: number;
  materialId?: number | null;
  customName?: string | null;
  unit: string;
  qty: number;
  note?: string | null;
  priority?: string;
  sourceType?: string;
  sourceQuoteId?: number | null;
  sourceStageId?: string | null;
  sourceQuoteRowId?: string | null;
  sourceMaterialFingerprint?: string | null;
  sourceStageName?: string | null;
}

export interface SupplyRequestDto {
  id: number;
  projectId: number;
  status: string;
  neededAt: string | null;
  comment: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  items?: SupplyRequestItemDto[];
  linkedOrders?: { id: number; status?: string }[];
  audit?: AuditEventDto[];
}

export interface SupplyOrderDto {
  id: number;
  projectId: number;
  sourceRequestId: number | null;
  supplierId: number | null;
  status: string;
  deliveryType: string;
  deliveryDatePlanned: string | null;
  paymentTerms: string | null;
  comment: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  items?: { id: number; orderId: number; materialId: number | null; customName: string | null; unit: string; qtyPlanned: string; unitPrice: string | null; note: string | null; receivedQtyTotal?: number; remainingQty?: number }[];
  sourceRequest?: { id: number } | null;
  linkedReceipts?: { id: number; status: string; total?: string | null; receivedAt?: string | null }[];
  totalPlan?: number;
  substitutionsCount?: number;
  audit?: AuditEventDto[];
}

export interface OrderSubstitutionDto {
  receiptItemId: number;
  receiptId: number;
  receiptReceivedAt: string | null;
  sourceOrderItemId: number | null;
  originalName: string;
  substituteName: string;
  qty: string;
  reason: string | null;
}

export interface SupplyReceiptItemDto {
  id: number;
  receiptId: number;
  sourceOrderItemId?: number | null;
  materialId: number | null;
  customName: string | null;
  unit: string;
  qtyReceived: string;
  unitPrice: string | null;
  isSubstitution?: boolean;
  originalMaterialId?: number | null;
  originalCustomName?: string | null;
  substituteMaterialId?: number | null;
  substituteCustomName?: string | null;
  substitutionReason?: string | null;
}

export interface SupplyReceiptDto {
  id: number;
  projectId: number;
  sourceOrderId: number;
  supplierId: number | null;
  status: string;
  receivedAt: string | null;
  receivedById: number | null;
  docNumber: string | null;
  comment: string | null;
  total: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  items?: SupplyReceiptItemDto[];
  attachments?: { id: number; originalName: string }[];
  sourceOrder?: { id: number };
  linkedPayable?: { id: number; status?: string } | null;
  payable?: { id: number; status: string; amount: string; paidAmount: string } | null;
  audit?: AuditEventDto[];
}

export interface PayableDto {
  id: number;
  projectId: number;
  supplierId: number | null;
  sourceReceiptId: number;
  status: string;
  amount: string;
  paidAmount: string;
  dueDate: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  sourceReceipt?: { id: number };
  balance?: number;
  payments?: { id: number; amount: string; paidAt: string; method: string; comment: string | null }[];
  audit?: AuditEventDto[];
}

export interface AuditEventDto {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  message: string | null;
  meta: Record<string, unknown> | null;
  actorId: number;
  createdAt: string;
}

// --- Helpers (for create form) ---
export interface ProjectOption { id: number; name: string }
export async function getSupplyProjectOptions(): Promise<ProjectOption[]> {
  const { data } = await api.get<ProjectOption[]>('/objects');
  return Array.isArray(data) ? data.map((o: any) => ({ id: o.id, name: o.name || `Об'єкт #${o.id}` })) : [];
}

// --- Requests ---
export async function getSupplyRequests(params?: { projectId?: number; status?: string }): Promise<SupplyRequestDto[]> {
  const { data } = await api.get<SupplyRequestDto[]>('/supply/requests', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSupplyRequest(id: number): Promise<SupplyRequestDto> {
  const { data } = await api.get<SupplyRequestDto>(`/supply/requests/${id}`);
  return data;
}

export async function deleteSupplyRequest(id: number): Promise<void> {
  await api.delete(`/supply/requests/${id}`);
}

// --- Quote stages (read-only, for adding materials to request) ---
export interface QuoteStageInfo {
  stageId: string;
  stageName: string;
}

export interface QuoteStagesResponse {
  quoteId: number;
  stages: QuoteStageInfo[];
}

export interface QuoteStageMaterialItem {
  materialId: number | null;
  materialName: string;
  unit: string;
  qtySuggested: number;
  quoteId: number;
  quoteRowId: string | null;
  fingerprint: string;
}

export interface QuoteStageMaterialsGroup {
  stageId: string;
  stageName: string;
  items: QuoteStageMaterialItem[];
}

/** Stage materials with need analytics (requested, ordered, received, remaining). */
export interface QuoteStageMaterialNeedItem extends QuoteStageMaterialItem {
  qtyFromQuote: number;
  qtyRequested: number;
  qtyOrdered: number;
  qtyReceived: number;
  qtyRemainingNeed: number;
}

export interface QuoteStageMaterialsNeedGroup {
  stageId: string;
  stageName: string;
  items: QuoteStageMaterialNeedItem[];
}

export async function getQuoteStages(projectId: number): Promise<QuoteStagesResponse> {
  const { data } = await api.get<QuoteStagesResponse>(`/supply/quotes/${projectId}/stages`);
  return data;
}

export async function getQuoteStageMaterials(projectId: number, quoteId: number, stageIds: string[]): Promise<QuoteStageMaterialsGroup[]> {
  const { data } = await api.get<QuoteStageMaterialsGroup[]>(`/supply/quotes/${projectId}/stage-materials`, {
    params: { quoteId, stageIds: stageIds.join(',') },
  });
  return Array.isArray(data) ? data : [];
}

export async function getQuoteStageMaterialsNeed(
  projectId: number,
  quoteId: number,
  stageIds: string[],
  mode?: string
): Promise<QuoteStageMaterialsNeedGroup[]> {
  const { data } = await api.get<QuoteStageMaterialsNeedGroup[]>(`/supply/quotes/${projectId}/stage-materials-need`, {
    params: { quoteId, stageIds: stageIds.join(','), ...(mode ? { mode } : {}) },
  });
  return Array.isArray(data) ? data : [];
}

export interface AddQuoteMaterialsPreviewConflict {
  selectionKey: string;
  existingRequestItemId: number;
  existingQty: number;
  incomingQty: number;
  materialName: string;
  unit: string;
  reason: 'same_quote_row' | 'same_fingerprint';
}

export interface AddQuoteMaterialsPreviewNewItem {
  selectionKey: string;
  incomingQty: number;
  materialName: string;
  unit: string;
}

export interface AddQuoteMaterialsPreviewResult {
  canAdd: number;
  conflicts: AddQuoteMaterialsPreviewConflict[];
  newItems: AddQuoteMaterialsPreviewNewItem[];
}

export async function previewAddQuoteMaterials(
  requestId: number,
  body: { quoteId: number; selections: { stageId: string; stageName?: string; quoteRowId?: string; materialId?: number; customName?: string; unit: string; qty: number; fingerprint?: string }[] }
): Promise<AddQuoteMaterialsPreviewResult> {
  const { data } = await api.post<AddQuoteMaterialsPreviewResult>(`/supply/requests/${requestId}/add-quote-materials/preview`, body);
  return data;
}

export type AddQuoteMaterialsMode = 'add_missing_only' | 'add_separate' | 'merge_qty';

export async function addQuoteMaterialsToRequest(
  requestId: number,
  body: {
    quoteId: number;
    selections: { stageId: string; stageName?: string; quoteRowId?: string; materialId?: number; customName?: string; unit: string; qty: number; fingerprint?: string }[];
    mode?: AddQuoteMaterialsMode;
    filterMode?: 'remaining';
  }
): Promise<{ added: number; merged: number; skipped: number }> {
  const { data } = await api.post<{ added: number; merged: number; skipped: number }>(`/supply/requests/${requestId}/add-quote-materials`, body);
  return data;
}

export async function exportSupplyRequest(
  requestId: number,
  format: 'pdf' | 'xlsx',
  groupBy: 'stage' | 'none' = 'none'
): Promise<Blob> {
  const { data } = await api.get<Blob>(`/supply/requests/${requestId}/export`, {
    params: { format, groupBy },
    responseType: 'blob',
  });
  return data;
}

export async function createSupplyRequest(body: { projectId: number; neededAt?: string; comment?: string; items?: SupplyRequestItemDto[] }): Promise<SupplyRequestDto> {
  const { data } = await api.post<SupplyRequestDto>('/supply/requests', body);
  return data;
}

export async function updateSupplyRequest(id: number, body: { neededAt?: string; comment?: string; items?: SupplyRequestItemDto[] }): Promise<SupplyRequestDto> {
  const { data } = await api.patch<SupplyRequestDto>(`/supply/requests/${id}`, body);
  return data;
}

export async function submitSupplyRequest(id: number): Promise<SupplyRequestDto> {
  const { data } = await api.post<SupplyRequestDto>(`/supply/requests/${id}/submit`);
  return data;
}

export async function closeSupplyRequest(id: number): Promise<SupplyRequestDto> {
  const { data } = await api.post<SupplyRequestDto>(`/supply/requests/${id}/close`);
  return data;
}

export async function createOrderFromRequest(requestId: number): Promise<{ orderId: number }> {
  const { data } = await api.post<{ orderId: number }>(`/supply/requests/${requestId}/create-order`);
  return data;
}

export async function saveRequestAsTemplate(requestId: number, body: { name: string; projectScoped?: boolean }): Promise<{ templateId: number }> {
  const { data } = await api.post<{ templateId: number }>(`/supply/requests/${requestId}/save-as-template`, body);
  return data;
}

// --- Purchase plan (auto-split) ---
export interface PurchasePlanItem {
  requestItemId: number;
  materialId: number | null;
  customName: string | null;
  unit: string;
  qty: string;
  suggestedUnitPrice: number | null;
  suggestedSupplierId: number | null;
}

export interface PurchasePlanGroup {
  key: string;
  supplierId: number | null;
  supplierName?: string;
  items: PurchasePlanItem[];
  totals: { itemsCount: number; sumSuggested: number };
}

export interface PurchasePlan {
  requestId: number;
  groups: PurchasePlanGroup[];
  totals: { groupsCount: number; itemsCount: number; sumSuggested: number };
}

export async function getPurchasePlan(requestId: number, projectId?: number): Promise<PurchasePlan> {
  const params = projectId != null ? { projectId } : {};
  const { data } = await api.get<PurchasePlan>(`/supply/requests/${requestId}/purchase-plan`, { params });
  return data;
}

export async function createOrdersByPlan(requestId: number, body: { mode?: string; includeUnassigned?: boolean; unassignedStrategy?: string }): Promise<{ createdOrderIds: number[] }> {
  const { data } = await api.post<{ createdOrderIds: number[] }>(`/supply/requests/${requestId}/create-orders-by-plan`, body);
  return data;
}

// --- Templates ---
export interface SupplyRequestTemplateItemDto {
  id?: number;
  materialId?: number | null;
  customName?: string | null;
  unit: string;
  qtyDefault: number;
  note?: string | null;
  priority?: string;
}

export interface SupplyRequestTemplateDto {
  id: number;
  name: string;
  projectId: number | null;
  createdById: number;
  isActive: boolean;
  items?: SupplyRequestTemplateItemDto[];
}

export async function getSupplyTemplates(projectId?: number): Promise<SupplyRequestTemplateDto[]> {
  const params = projectId != null ? { projectId } : {};
  const { data } = await api.get<SupplyRequestTemplateDto[]>('/supply/templates', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSupplyTemplate(id: number): Promise<SupplyRequestTemplateDto> {
  const { data } = await api.get<SupplyRequestTemplateDto>(`/supply/templates/${id}`);
  return data;
}

export async function createRequestFromTemplate(templateId: number, body: { projectId: number; neededAt?: string; comment?: string }): Promise<{ requestId: number }> {
  const { data } = await api.post<{ requestId: number }>(`/supply/templates/${templateId}/create-request`, body);
  return data;
}

// --- Materials (for substitution dropdown) ---
export interface SupplyMaterialDto {
  id: number;
  name: string;
  unit: string | null;
  category?: string | null;
  isActive?: boolean;
}

export async function getSupplyMaterials(): Promise<SupplyMaterialDto[]> {
  try {
    const { data } = await api.get<SupplyMaterialDto[]>('/supply/materials');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// --- Last purchase / recent suppliers (batch to avoid N+1) ---
export interface LastPurchaseResult {
  unitPrice: string;
  supplierId: number | null;
  receivedAt: string;
  receiptId: number;
}

export interface RecentSupplierResult {
  supplierId: number;
  supplierName: string;
  lastPrice: string;
  lastDate: string;
}

export async function getLastPurchasesBatch(body: { materialIds: number[]; projectId?: number }): Promise<Record<number, LastPurchaseResult>> {
  const { data } = await api.post<Record<number, LastPurchaseResult>>('/supply/materials/last-purchases', body);
  return data ?? {};
}

export async function getRecentSuppliersBatch(body: { materialIds: number[]; projectId?: number; limit?: number }): Promise<Record<number, RecentSupplierResult[]>> {
  const { data } = await api.post<Record<number, RecentSupplierResult[]>>('/supply/materials/recent-suppliers', body);
  return data ?? {};
}

// --- Orders ---
export async function getSupplyOrders(params?: { projectId?: number; status?: string; supplierId?: number }): Promise<SupplyOrderDto[]> {
  const { data } = await api.get<SupplyOrderDto[]>('/supply/orders', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSupplyOrder(id: number): Promise<SupplyOrderDto> {
  const { data } = await api.get<SupplyOrderDto>(`/supply/orders/${id}`);
  return data;
}

export async function deleteSupplyOrder(id: number): Promise<void> {
  await api.delete(`/supply/orders/${id}`);
}

export async function getOrderSubstitutions(orderId: number): Promise<OrderSubstitutionDto[]> {
  const { data } = await api.get<OrderSubstitutionDto[]>(`/supply/orders/${orderId}/substitutions`);
  return Array.isArray(data) ? data : [];
}

export async function createSupplyOrder(body: Record<string, unknown>): Promise<SupplyOrderDto> {
  const { data } = await api.post<SupplyOrderDto>('/supply/orders', body);
  return data;
}

export async function updateSupplyOrder(id: number, body: Record<string, unknown>): Promise<SupplyOrderDto> {
  const { data } = await api.patch<SupplyOrderDto>(`/supply/orders/${id}`, body);
  return data;
}

export async function setSupplyOrderStatus(id: number, status: string): Promise<SupplyOrderDto> {
  const { data } = await api.post<SupplyOrderDto>(`/supply/orders/${id}/set-status`, { status });
  return data;
}

export async function createReceiptFromOrder(orderId: number): Promise<{ receiptId: number }> {
  const { data } = await api.post<{ receiptId: number }>(`/supply/orders/${orderId}/create-receipt`);
  return data;
}

export async function createReceiptQuickFromOrder(orderId: number, body?: { mode?: 'remaining'; includeZeroLines?: boolean }): Promise<{ receiptId: number }> {
  const { data } = await api.post<{ receiptId: number }>(`/supply/orders/${orderId}/create-receipt-quick`, body ?? { mode: 'remaining', includeZeroLines: false });
  return data;
}

export async function moveOrderItems(fromOrderId: number, body: { toOrderId: number; itemIds: number[]; mergeDuplicates?: boolean }): Promise<{ movedCount: number; fromOrder: SupplyOrderDto; toOrder: SupplyOrderDto }> {
  const { data } = await api.post<{ movedCount: number; fromOrder: SupplyOrderDto; toOrder: SupplyOrderDto }>(`/supply/orders/${fromOrderId}/move-items`, body);
  return data;
}

export async function mergeOrder(orderId: number, body: { targetOrderId: number; strategy?: string; mergeDuplicates?: boolean; cancelSourceOrder?: boolean }): Promise<{ movedCount: number; sourceOrder: SupplyOrderDto; toOrder: SupplyOrderDto }> {
  const { data } = await api.post<{ movedCount: number; sourceOrder: SupplyOrderDto; toOrder: SupplyOrderDto }>(`/supply/orders/${orderId}/merge`, body);
  return data;
}

export async function fillOrderPricesFromLast(orderId: number): Promise<{ order: SupplyOrderDto; filledCount: number; suggestedSupplierId?: number }> {
  const { data } = await api.post<{ order: SupplyOrderDto; filledCount: number; suggestedSupplierId?: number }>(`/supply/orders/${orderId}/fill-prices-from-last`);
  return data;
}

// --- Receipts ---
export async function getSupplyReceipts(params?: { projectId?: number; status?: string; supplierId?: number }): Promise<SupplyReceiptDto[]> {
  const { data } = await api.get<SupplyReceiptDto[]>('/supply/receipts', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSupplyReceipt(id: number): Promise<SupplyReceiptDto> {
  const { data } = await api.get<SupplyReceiptDto>(`/supply/receipts/${id}`);
  return data;
}

export async function updateSupplyReceipt(id: number, body: { docNumber?: string; comment?: string; items?: { sourceOrderItemId?: number; materialId?: number; customName?: string; unit: string; qtyReceived: number; unitPrice?: number; note?: string }[] }): Promise<SupplyReceiptDto> {
  const { data } = await api.patch<SupplyReceiptDto>(`/supply/receipts/${id}`, body);
  return data;
}

export async function receiveSupplyReceipt(id: number): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${id}/receive`);
  return data;
}

export async function verifySupplyReceipt(id: number): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${id}/verify`);
  return data;
}

export async function sendReceiptToPay(id: number): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${id}/send-to-pay`);
  return data;
}

export async function fillReceiptPricesFromLast(receiptId: number): Promise<{ receipt: SupplyReceiptDto; filledCount: number }> {
  const { data } = await api.post<{ receipt: SupplyReceiptDto; filledCount: number }>(`/supply/receipts/${receiptId}/fill-prices-from-last`);
  return data;
}

export async function refillReceiptFromRemaining(receiptId: number): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${receiptId}/refill-from-remaining`);
  return data;
}

export async function setReceiptSubstitution(receiptId: number, itemId: number, body: { isSubstitution: boolean; substituteMaterialId?: number | null; substituteCustomName?: string | null; substitutionReason?: string | null }): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${receiptId}/items/${itemId}/set-substitution`, body);
  return data;
}

export async function clearReceiptSubstitution(receiptId: number, itemId: number): Promise<SupplyReceiptDto> {
  const { data } = await api.post<SupplyReceiptDto>(`/supply/receipts/${receiptId}/items/${itemId}/clear-substitution`);
  return data;
}

// --- Payables ---
export async function getPayables(params?: { projectId?: number; status?: string; supplierId?: number }): Promise<PayableDto[]> {
  const { data } = await api.get<PayableDto[]>('/supply/payables', { params });
  return Array.isArray(data) ? data : [];
}

export async function getPayable(id: number): Promise<PayableDto> {
  const { data } = await api.get<PayableDto>(`/supply/payables/${id}`);
  return data;
}

export async function addPayment(payableId: number, body: { amount: number; paidAt: string; method?: string; comment?: string }): Promise<PayableDto> {
  const { data } = await api.post<PayableDto>(`/supply/payables/${payableId}/payments`, body);
  return data;
}

// --- Audit ---
export async function getAudit(params?: { entityType?: string; entityId?: number; limit?: number }): Promise<AuditEventDto[]> {
  const { data } = await api.get<AuditEventDto[]>('/audit', { params });
  return Array.isArray(data) ? data : [];
}
