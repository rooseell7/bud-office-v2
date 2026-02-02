import api from './api';

export type WorkItemDto = {
  id: number;
  name: string;
  unit?: string | null;
  category?: string | null;
  defaultRateMaster?: string;
  defaultRateClient?: string;
  isActive?: boolean;
};

export async function searchWorkItems(q: string): Promise<{ id: number; name: string; unit?: string | null }[]> {
  const res = await api.get<WorkItemDto[]>('/work-items', {
    params: q.trim() ? { q: q.trim() } : {},
  });
  const items = Array.isArray(res.data) ? res.data : [];
  return items.map((w) => ({ id: w.id, name: w.name, unit: w.unit ?? null }));
}
