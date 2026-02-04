import api from './api';

export type PresenceUser = { id: number; fullName: string };

export async function getPresenceOnline(): Promise<PresenceUser[]> {
  try {
    const res = await api.get<PresenceUser[]>('/presence/online');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: unknown) {
    // 404 = backend не обслуговує presence (не запущений або nginx не проксує /api)
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 502 || status === 503) return [];
    throw err;
  }
}
