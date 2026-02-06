import api from './api';

export interface ProjectSummaryDto {
  id: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone: string } | null;
  salesStage: string;
  executionStatus: string | null;
}

export interface ProjectHealthDto {
  missingClient: boolean;
  missingForeman: boolean;
  missingContract: boolean;
  hasOverdueNextAction: boolean;
  hasUnpaidInvoices: boolean;
}

export interface ProjectDetailsDto extends ProjectSummaryDto {
  city?: string | null;
  type?: string | null;
  areaM2?: string | null;
  finishClass?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  tags?: string[] | null;
  accessInfo?: Record<string, unknown> | null;
  notes?: string | null;
  ownerId?: number | null;
  foremanId?: number | null;
  estimatorId?: number | null;
  supplyManagerId?: number | null;
  owner?: { id: number; name: string } | null;
  foreman?: { id: number; name: string } | null;
  estimator?: { id: number; name: string } | null;
  supplyManager?: { id: number; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectAttachmentDto {
  id: number;
  entityType: string;
  entityId: number;
  tag: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: string;
  path: string;
  uploadedByUserId: number | null;
  createdAt: string;
}

export interface TimelineEvent {
  type: string;
  at: string;
  title: string;
  entity?: { type: string; id: number };
  entityId?: number;
  actor?: { id: number; name: string };
  meta?: Record<string, unknown>;
}

export interface ProjectTimelineQuery {
  from?: string;
  to?: string;
  types?: string;
  limit?: number;
}

export async function getProjectSummary(projectId: number): Promise<ProjectSummaryDto> {
  const { data } = await api.get<ProjectSummaryDto>(`/projects/${projectId}/summary`);
  return data;
}

export async function getProjectDetails(projectId: number): Promise<ProjectDetailsDto> {
  const { data } = await api.get<ProjectDetailsDto>(`/projects/${projectId}/details`);
  return data;
}

export async function getProjectHealth(projectId: number): Promise<ProjectHealthDto> {
  const { data } = await api.get<ProjectHealthDto>(`/projects/${projectId}/health`);
  return data;
}

export async function getProjectAttachments(projectId: number): Promise<ProjectAttachmentDto[]> {
  const { data } = await api.get<ProjectAttachmentDto[]>(`/projects/${projectId}/attachments`);
  return Array.isArray(data) ? data : [];
}

export async function uploadProjectAttachment(
  projectId: number,
  file: File,
  tag?: string,
): Promise<ProjectAttachmentDto> {
  const form = new FormData();
  form.append('file', file);
  if (tag) form.append('tag', tag);
  const { data } = await api.post<ProjectAttachmentDto>(`/projects/${projectId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteProjectAttachment(
  projectId: number,
  attachmentId: number,
): Promise<void> {
  await api.delete(`/projects/${projectId}/attachments/${attachmentId}`);
}

export interface CreateProjectBody {
  name: string;
  address?: string;
  city?: string;
  type?: string;
  areaM2?: number;
  finishClass?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  salesStage?: string;
  executionStatus?: string;
  clientId?: number | null;
  ownerId?: number | null;
  foremanId?: number | null;
  estimatorId?: number | null;
  supplyManagerId?: number | null;
  tags?: string[] | null;
  accessInfo?: Record<string, unknown> | null;
  notes?: string | null;
}

export async function createProject(body: CreateProjectBody): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>('/projects', body);
  return data;
}

export async function updateProject(
  projectId: number,
  body: Partial<CreateProjectBody>,
): Promise<void> {
  await api.patch(`/projects/${projectId}`, body);
}

export async function getProjectTimeline(
  projectId: number,
  query?: ProjectTimelineQuery,
): Promise<TimelineEvent[]> {
  const params = new URLSearchParams();
  if (query?.from) params.set('from', query.from);
  if (query?.to) params.set('to', query.to);
  if (query?.types) params.set('types', query.types);
  if (query?.limit != null && query.limit > 0) params.set('limit', String(query.limit));
  const url = `/projects/${projectId}/timeline` + (params.toString() ? `?${params.toString()}` : '');
  const { data } = await api.get<TimelineEvent[]>(url);
  return Array.isArray(data) ? data : [];
}
