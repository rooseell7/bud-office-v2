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

// STEP 6: Activity Feed (audit_log)
export type ActivityFeedItem = {
  id: string;
  createdAt: string;
  actor: { id: number; name: string; initials: string };
  action: string;
  entity: { type: string; id: string; title: string | null };
  projectId: number | null;
  meta: Record<string, unknown> | null;
};

export type ActivityFeedParams = {
  scope?: 'global' | 'project' | 'entity';
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: number | null;
  actionPrefix?: string | null;
  from?: string | null;
  to?: string | null;
  cursor?: string | null;
  limit?: number;
};

export type ActivityFeedResult = {
  items: ActivityFeedItem[];
  nextCursor: string | null;
};

export async function getActivityFeed(params: ActivityFeedParams = {}): Promise<ActivityFeedResult> {
  const res = await api.get<ActivityFeedResult>('/activity/feed', {
    params: params as Record<string, unknown>,
  });
  return res.data ?? { items: [], nextCursor: null };
}

export async function getActivityFeedByProject(projectId: number, params?: { cursor?: string; limit?: number }): Promise<ActivityFeedResult> {
  const res = await api.get<ActivityFeedResult>(`/activity/feed/project/${projectId}`, {
    params: params ?? {},
  });
  return res.data ?? { items: [], nextCursor: null };
}

export async function getActivityFeedByEntity(entityType: string, entityId: string, params?: { cursor?: string; limit?: number }): Promise<ActivityFeedResult> {
  const res = await api.get<ActivityFeedResult>(`/activity/feed/entity/${entityType}/${entityId}`, {
    params: params ?? {},
  });
  return res.data ?? { items: [], nextCursor: null };
}
