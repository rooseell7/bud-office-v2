/**
 * STEP 10: Notifications API.
 */
import api from './api';

export type NotificationItem = {
  id: string;
  createdAt: string;
  type: string;
  title: string;
  body: string | null;
  projectId: number | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
};

export type NotificationsResult = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export async function getNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<NotificationsResult> {
  const res = await api.get<NotificationsResult>('/notifications', {
    params: {
      unreadOnly: params?.unreadOnly ? '1' : undefined,
      limit: params?.limit ?? 50,
      cursor: params?.cursor,
    },
  });
  return res.data ?? { items: [], nextCursor: null };
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/notifications/unread-count');
  return res.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}
