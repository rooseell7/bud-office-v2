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
