import api from './api';
import { deleteDocument } from './documents';

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
