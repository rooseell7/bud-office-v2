import { API_BASE_URL } from '../../shared/api/apiClient';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? API_BASE_URL;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export type WorkLog = {
  id: number;
  projectId: number;
  stageId: number | null;
  name: string;
  qty: string;      // numeric -> string
  unit: string | null;
  price: string;    // numeric -> string
  amount: string;   // numeric -> string
  status: 'draft' | 'done';
  createdAt: string;
};

export type CreateWorkLogPayload = {
  projectId: number;
  stageId?: number;
  name: string;
  qty: number;
  unit?: string;
  price: number;
  status?: 'draft' | 'done';
};

export type ActItem = {
  id: number;
  name: string;
  qty: string;
  unit: string | null;
  price: string;
  amount: string;
};

export type Act = {
  id: number;
  projectId: number;
  stageId: number | null;
  number: string;
  date: string;
  totalAmount: string;
  items: ActItem[];
  createdAt: string;
};

export type CreateActItemPayload = {
  name: string;
  qty: number;
  unit?: string;
  price: number;
};

export type CreateActPayload = {
  projectId: number;
  stageId?: number;
  number: string;
  date: string; // YYYY-MM-DD
  items: CreateActItemPayload[];
};

export type DeliveryAnalytics = {
  projectId: number;
  worksSum: string;
  actsSum: string;
  diff: string;
  worksCount: number;
  actsCount: number;
};

export function getWorkLogs(projectId: number) {
  return http<WorkLog[]>(`/delivery/work-logs?projectId=${projectId}`);
}

export function createWorkLog(payload: CreateWorkLogPayload) {
  return http<WorkLog>(`/delivery/work-logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setWorkStatus(id: number, status: 'draft' | 'done') {
  return http<WorkLog>(`/delivery/work-logs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getActs(projectId: number) {
  return http<Act[]>(`/delivery/acts?projectId=${projectId}`);
}

export function createAct(payload: CreateActPayload) {
  return http<Act>(`/delivery/acts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAnalytics(projectId: number) {
  return http<DeliveryAnalytics>(`/delivery/analytics?projectId=${projectId}`);
}