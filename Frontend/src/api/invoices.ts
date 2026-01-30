import api from './api';

export type InvoiceItem = {
  materialId?: number;
  materialName?: string;
  unit?: string;
  qty?: number | string;
  supplierPrice?: number | string;
  clientPrice?: number | string;
};

export type Invoice = {
  id: number;
  projectId: number | null;
  objectId: number | null;
  supplyManagerId: number;
  supplierName: string;
  customerName: string;
  status: string;
  items: InvoiceItem[];
  total: string;
  createdAt: string;
  updatedAt: string;
};

export async function getInvoices(params?: {
  objectId?: number;
  projectId?: number;
  q?: string;
  skip?: number;
  take?: number;
}): Promise<Invoice[]> {
  const res = await api.get<Invoice[]>('/invoices', { params });
  return res.data;
}

export async function getInvoice(id: number): Promise<Invoice> {
  const res = await api.get<Invoice>(`/invoices/${id}`);
  return res.data;
}

export async function createInvoice(dto: Partial<Invoice>): Promise<Invoice> {
  const res = await api.post<Invoice>('/invoices', dto);
  return res.data;
}

export async function updateInvoice(id: number, dto: Partial<Invoice>): Promise<Invoice> {
  const res = await api.patch<Invoice>(`/invoices/${id}`, dto);
  return res.data;
}

export async function deleteInvoice(id: number): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function downloadInvoicePdf(id: number): Promise<Blob> {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  return res.data as Blob;
}
