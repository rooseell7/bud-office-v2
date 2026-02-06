import api from './api';
import { deleteDocument } from './documents';

export type EstimateStage = { id: string; name: string; order: number };

export type EstimateDocumentWithStages = {
  id: number;
  type: string;
  title: string | null;
  status: string;
  projectId: number | null;
  meta?: Record<string, any>;
  stages: EstimateStage[];
  createdAt?: string;
  updatedAt?: string;
};

export type EstimateItem = {
  id: number;
  projectId: number | null;
  title: string;
  status?: string;
  updatedAt?: string;
  projectName?: string | null;
  createdByName?: string | null;
};

export type RecentEstimateItem = EstimateItem;

export interface EstimatesProjectItem {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string } | null;
  quote: {
    lastQuoteId: number | null;
    status: string | null;
    total: string | null;
    updatedAt: string | null;
  };
  acts: { count: number; lastActAt: string | null };
  invoices: { count: number; unpaidCount: number; lastInvoiceAt: string | null };
  lastActivityAt: string | null;
}

export async function getEstimatesProjectDashboard(
  projectId: number,
): Promise<EstimatesProjectItem> {
  const { data } = await api.get<EstimatesProjectItem>(
    `/estimates/projects/${projectId}/dashboard`,
  );
  return data;
}

export interface EstimatesProjectsResponse {
  items: EstimatesProjectItem[];
  total: number;
}

export interface EstimatesProjectsQuery {
  q?: string;
  quoteStatus?: string;
  hasUnpaidInvoices?: boolean;
  activeFrom?: string;
  activeTo?: string;
  page?: number;
  limit?: number;
}

export async function getEstimatesProjects(
  query?: EstimatesProjectsQuery,
): Promise<EstimatesProjectsResponse> {
  const params = new URLSearchParams();
  if (query?.q != null && query.q !== '') params.set('q', query.q);
  if (query?.quoteStatus != null && query.quoteStatus !== '') params.set('quoteStatus', query.quoteStatus);
  if (query?.hasUnpaidInvoices === true) params.set('hasUnpaidInvoices', 'true');
  if (query?.activeFrom) params.set('activeFrom', query.activeFrom);
  if (query?.activeTo) params.set('activeTo', query.activeTo);
  if (query?.page != null && query.page > 0) params.set('page', String(query.page));
  if (query?.limit != null && query.limit > 0) params.set('limit', String(query.limit));
  const url = '/estimates/projects' + (params.toString() ? `?${params.toString()}` : '');
  const res = await api.get<EstimatesProjectsResponse>(url);
  return res.data;
}

export function buildDocKey(estimateId: number, stageId: string, sheetType: 'works' | 'materials'): string {
  return `estimate:${estimateId}:stage:${stageId}:${sheetType}`;
}

export async function getDocumentWithStages(estimateId: number): Promise<EstimateDocumentWithStages> {
  const res = await api.get<EstimateDocumentWithStages>(`/estimates/${estimateId}/document`);
  return res.data;
}

export async function createStage(
  estimateId: number,
  payload: { name?: string; order?: number },
): Promise<EstimateStage> {
  const res = await api.post<EstimateStage>(`/estimates/${estimateId}/stages`, payload);
  return res.data;
}

export async function updateStage(
  estimateId: number,
  stageId: string,
  payload: { name?: string; order?: number },
): Promise<EstimateStage> {
  const res = await api.patch<EstimateStage>(`/estimates/${estimateId}/stages/${encodeURIComponent(stageId)}`, payload);
  return res.data;
}

export async function deleteStage(estimateId: number, stageId: string): Promise<void> {
  await api.delete(`/estimates/${estimateId}/stages/${encodeURIComponent(stageId)}`);
}

export async function duplicateStage(
  estimateId: number,
  stageId: string,
): Promise<EstimateStage> {
  const res = await api.post<EstimateStage>(
    `/estimates/${estimateId}/stages/${encodeURIComponent(stageId)}/duplicate`,
  );
  return res.data;
}

export async function getSheetByDocKey(
  estimateId: number,
  docKey: string,
): Promise<{ snapshot: Record<string, any>; revision: number }> {
  const res = await api.get<{ snapshot: Record<string, any>; revision: number }>(
    `/estimates/${estimateId}/sheet`,
    { params: { docKey } },
  );
  return res.data;
}

export async function saveSheetByDocKey(
  estimateId: number,
  docKey: string,
  snapshot: Record<string, any>,
  expectedRevision?: number,
): Promise<{ revision: number }> {
  const res = await api.patch<{ revision: number }>(`/estimates/${estimateId}/sheet`, {
    docKey,
    snapshot,
    expectedRevision,
  });
  return res.data;
}

export async function getEstimatesByProject(
  projectId: number,
  limit?: number,
): Promise<EstimateItem[]> {
  const res = await api.get<EstimateItem[]>('/estimates', {
    params: { projectId, limit: limit ?? 50 },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getRecentEstimates(
  limit?: number,
): Promise<RecentEstimateItem[]> {
  const res = await api.get<RecentEstimateItem[]>('/estimates/recent', {
    params: { limit: limit ?? 10 },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createEstimate(payload: {
  projectId: number;
  title?: string;
}): Promise<{ id: number; projectId: number | null; title: string }> {
  const res = await api.post<{ id: number; projectId: number | null; title: string }>(
    '/estimates',
    payload,
  );
  return res.data;
}

/**
 * Видалення КП. Використовує DELETE /documents/:id (КП = document type='quote').
 * Джерело правди — documents API, estimates list той самий entity.
 */
export async function deleteEstimate(id: number): Promise<void> {
  await deleteDocument(id);
}

export async function exportEstimateXlsx(estimateId: number): Promise<Blob> {
  const res = await api.get<Blob>(`/estimates/${estimateId}/export/xlsx`, {
    responseType: 'blob',
  });
  return res.data;
}
