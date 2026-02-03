import api from './api';

export type ExecutionProjectListItem = {
  id: number;
  name: string;
  status: string;
  foremanId: number | null;
  openTasksCount: number;
  overdueTasksCount: number;
  updatedAt: string;
};

export type ExecutionTaskStatus = 'new' | 'in_progress' | 'blocked' | 'done' | 'canceled';
export type ExecutionTaskPriority = 'low' | 'medium' | 'high';

export type ExecutionTaskDto = {
  id: number;
  projectId: number;
  stageId: number | null;
  title: string;
  description: string | null;
  assigneeId: number;
  assigneeName?: string;
  status: ExecutionTaskStatus;
  priority: string;
  dueDate: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
};

export type ExecutionTaskEventDto = {
  id: number;
  taskId: number;
  type: string;
  payload: Record<string, unknown> | null;
  createdById: number | null;
  createdAt: string;
};

export type ExecutionProjectDetail = {
  project: { id: number; name: string; address?: string | null; status: string; foremanId?: number | null };
  tasks: ExecutionTaskDto[];
};

export async function getExecutionProjects(params?: {
  status?: string;
  foremanId?: number;
  overdue?: boolean;
}): Promise<ExecutionProjectListItem[]> {
  const res = await api.get<ExecutionProjectListItem[]>('/execution/projects', { params: params ?? {} });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getExecutionProject(id: number): Promise<ExecutionProjectDetail> {
  const res = await api.get<ExecutionProjectDetail>(`/execution/projects/${id}`);
  return res.data;
}

export async function createExecutionTask(
  projectId: number,
  dto: {
    stageId?: number | null;
    title: string;
    description?: string | null;
    assigneeId: number;
    priority?: ExecutionTaskPriority;
    dueDate?: string | null;
  },
): Promise<ExecutionTaskDto> {
  const res = await api.post<ExecutionTaskDto>(`/execution/projects/${projectId}/tasks`, dto);
  return res.data;
}

export async function updateExecutionTask(
  taskId: number,
  dto: Partial<{
    stageId: number | null;
    title: string;
    description: string | null;
    assigneeId: number;
    status: ExecutionTaskStatus;
    priority: string;
    dueDate: string | null;
  }>,
): Promise<ExecutionTaskDto> {
  const res = await api.patch<ExecutionTaskDto>(`/execution/tasks/${taskId}`, dto);
  return res.data;
}

export async function addExecutionTaskComment(
  taskId: number,
  dto: { comment?: string },
): Promise<ExecutionTaskEventDto> {
  const res = await api.post<ExecutionTaskEventDto>(`/execution/tasks/${taskId}/comments`, dto);
  return res.data;
}

export async function getExecutionTaskEvents(taskId: number): Promise<ExecutionTaskEventDto[]> {
  const res = await api.get<ExecutionTaskEventDto[]>(`/execution/tasks/${taskId}/events`);
  return Array.isArray(res.data) ? res.data : [];
}

export type StageDto = { id: number; name: string; objectId: number; order?: number };

export async function getStagesByObjectId(objectId: number): Promise<StageDto[]> {
  const res = await api.get<StageDto[]>('/stages', { params: { objectId } });
  return Array.isArray(res.data) ? res.data : [];
}
