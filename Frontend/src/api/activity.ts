import api from './api';

export type ActivityLogItem = {
  id: number;
  ts: string;
  actorId: number | null;
  entity: string;
  action: string;
  entityId: number;
  projectId: number | null;
  summary: string | null;
  payload: Record<string, unknown> | null;
};

export async function getActivity(params?: {
  limit?: number;
  projectId?: number;
}): Promise<ActivityLogItem[]> {
  const res = await api.get<ActivityLogItem[]>('/activity', {
    params: params ?? {},
  });
  return Array.isArray(res.data) ? res.data : [];
}
