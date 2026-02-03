import api from './api';

export type ForemanObjectDto = {
  id: number;
  name: string;
  address?: string | null;
  status: string;
  updatedAt: string;
  openIssuesCount?: number;
  todayWorkLogsCount?: number;
};

export type ForemanEventDto = {
  id: number;
  objectId: number;
  type: string;
  payload: Record<string, any> | null;
  createdById: number | null;
  createdAt: string;
};

export async function getForemanObjects(): Promise<ForemanObjectDto[]> {
  const res = await api.get<ForemanObjectDto[]>('/foreman/objects');
  return Array.isArray(res.data) ? res.data : [];
}

export async function getForemanObject(id: number): Promise<any> {
  const res = await api.get(`/foreman/objects/${id}`);
  return res.data;
}

export async function getForemanEvents(
  objectId: number,
  params?: { limit?: number; before?: string },
): Promise<ForemanEventDto[]> {
  const res = await api.get<ForemanEventDto[]>(`/foreman/objects/${objectId}/events`, {
    params: params ?? {},
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createForemanEvent(
  objectId: number,
  dto: { type: string; payload?: Record<string, unknown> },
): Promise<ForemanEventDto> {
  const res = await api.post<ForemanEventDto>(`/foreman/objects/${objectId}/events`, dto);
  return res.data;
}

export type ForemanTaskDto = {
  id: number;
  projectId: number;
  stageId: number | null;
  title: string;
  description: string | null;
  assigneeId: number;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
};

export async function getForemanObjectTasks(
  objectId: number,
  params?: { includeDone?: boolean },
): Promise<ForemanTaskDto[]> {
  const res = await api.get<ForemanTaskDto[]>(`/foreman/objects/${objectId}/tasks`, {
    params: params ?? {},
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateForemanTaskStatus(
  taskId: number,
  dto: { status: string; comment?: string; blockedReason?: string },
): Promise<ForemanTaskDto> {
  const res = await api.patch<ForemanTaskDto>(`/foreman/tasks/${taskId}/status`, dto);
  return res.data;
}
