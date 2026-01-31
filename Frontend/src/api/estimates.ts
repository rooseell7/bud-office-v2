import api from './api';

export type EstimateItem = {
  id: number;
  projectId: number | null;
  title: string;
  status?: string;
  updatedAt?: string;
};

export type RecentEstimateItem = EstimateItem & {
  projectName?: string | null;
};

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
