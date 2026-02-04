import api from './api';

// --- Types (align with backend) ---
export interface SupplyRequestItemDto {
  materialId?: number | null;
  customName?: string | null;
  unit: string;
  qty: number;
  note?: string | null;
  priority?: string;
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
  items?: { id: number; orderId: number; materialId: number | null; customName: string | null; unit: string; qtyPlanned: string; unitPrice: string | null; note: string | null }[];
  linkedReceipts?: { id: number; status: string; total: string | null }[];
  audit?: AuditEventDto[];
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
  items?: { id: number; receiptId: number; materialId: number | null; customName: string | null; unit: string; qtyReceived: string; unitPrice: string | null }[];
  attachments?: { id: number; originalName: string }[];
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

// --- Orders ---
export async function getSupplyOrders(params?: { projectId?: number; status?: string; supplierId?: number }): Promise<SupplyOrderDto[]> {
  const { data } = await api.get<SupplyOrderDto[]>('/supply/orders', { params });
  return Array.isArray(data) ? data : [];
}

export async function getSupplyOrder(id: number): Promise<SupplyOrderDto> {
  const { data } = await api.get<SupplyOrderDto>(`/supply/orders/${id}`);
  return data;
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
