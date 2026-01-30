import api from '../../../api/api';

export type Id = number;

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'canceled';

export type InvoiceType = 'external' | 'internal';
export type InternalDirection = 'IN' | 'OUT';

export type Invoice = {
  id: Id;
  /** Обʼєкт (projectId). Для internal може бути 0/відсутнім. */
  objectId: Id;
  /** Порядковий номер накладної в межах обʼєкта (projectId). */
  objectSeq?: number | null;
  type?: InvoiceType | string;
  internalDirection?: InternalDirection | string | null;
  warehouseId?: number | null;
  supplierName?: string | null;
  customerName?: string | null;
  supplierMarginPct?: string | number | null;
  customerMarginPct?: string | number | null;
  status: InvoiceStatus;
  items: any[]; // JSONB (InvoiceItem[]), на UI нормалізуємо
  totalSupplier?: string | number | null;
  totalCustomer?: string | number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInvoiceDto = {
  // external: objectId обовʼязковий; internal: може бути відсутнім
  objectId?: Id;
  type?: InvoiceType | string;
  internalDirection?: InternalDirection | string;
  warehouseId?: number;
  supplierName?: string;
  customerName?: string;
  supplierMarginPct?: number;
  customerMarginPct?: number;
  status?: InvoiceStatus;
  items?: any[];
  notes?: string;
};

export type UpdateInvoiceDto = Partial<CreateInvoiceDto>;

export async function listInvoices(params?: { objectId?: number; status?: string; q?: string }) {
  const res = await api.get<Invoice[]>('/invoices', { params });
  return res.data;
}

export async function createInvoice(dto: CreateInvoiceDto) {
  const res = await api.post<Invoice>('/invoices', dto);
  return res.data;
}

export async function getInvoice(id: Id) {
  const res = await api.get<Invoice>(`/invoices/${id}`);
  return res.data;
}

export async function updateInvoice(id: Id, dto: UpdateInvoiceDto) {
  const res = await api.patch<Invoice>(`/invoices/${id}`, dto);
  return res.data;
}

export async function downloadInvoicePdf(id: Id, view: 'client' | 'internal' = 'client') {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob', params: { view } });
  return res.data as Blob;
}
