import api from './api';

export interface SalesProjectItem {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone?: string } | null;
  salesStage: string;
  deal: { id: number; title: string; amount: string; stage: string; status: string } | null;
  nextAction: { type: string; dueAt: string } | null;
  lastContactAt: string | null;
  owner: { id: number; name: string } | null;
}

export interface SalesProjectsResponse {
  items: SalesProjectItem[];
  total: number;
}

export interface SalesProjectsQuery {
  q?: string;
  salesStage?: string;
  ownerId?: number;
  nextActionBucket?: 'today' | 'this_week' | 'overdue' | 'any';
  page?: number;
  limit?: number;
}

export interface SalesProjectDetails {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone: string } | null;
  salesStage: string;
  deal: { id: number; title: string; amount: string; stage: string; status: string } | null;
  nextAction: { type: string; dueAt: string; note?: string } | null;
  owner: { id: number; name: string } | null;
}

export interface SalesOwnerOption {
  id: number;
  name: string;
}

export async function getSalesOwners(): Promise<SalesOwnerOption[]> {
  const { data } = await api.get<SalesOwnerOption[]>('/sales/owners');
  return Array.isArray(data) ? data : [];
}

export async function getSalesProjects(query?: SalesProjectsQuery): Promise<SalesProjectsResponse> {
  const params = new URLSearchParams();
  if (query?.q != null && query.q !== '') params.set('q', query.q);
  if (query?.salesStage != null && query.salesStage !== '') params.set('salesStage', query.salesStage);
  if (query?.ownerId != null) params.set('ownerId', String(query.ownerId));
  if (query?.nextActionBucket != null && query.nextActionBucket !== 'any') params.set('nextActionBucket', query.nextActionBucket);
  if (query?.page != null && query.page > 0) params.set('page', String(query.page));
  if (query?.limit != null && query.limit > 0) params.set('limit', String(query.limit));
  const url = '/sales/projects' + (params.toString() ? `?${params.toString()}` : '');
  const { data } = await api.get<SalesProjectsResponse>(url);
  return data;
}

export async function getSalesProjectDetails(projectId: number): Promise<SalesProjectDetails> {
  const { data } = await api.get<SalesProjectDetails>(`/sales/projects/${projectId}/details`);
  return data;
}

export async function updateSalesProject(
  projectId: number,
  payload: { name?: string; address?: string; salesStage?: string; ownerId?: number | null },
): Promise<void> {
  await api.patch(`/sales/projects/${projectId}`, payload);
}

export async function setNextAction(
  projectId: number,
  payload: { type: string; dueAt: string; note?: string },
): Promise<{ completedPrevious: boolean }> {
  const { data } = await api.post(`/sales/projects/${projectId}/next-action`, payload);
  return data;
}

export async function completeAction(projectId: number, comment?: string): Promise<void> {
  await api.post(`/sales/projects/${projectId}/complete-action`, { comment });
}

export interface SalesContactDto {
  id: number;
  type: string;
  result: string | null;
  at: string;
  createdAt: string;
  createdById: number | null;
}

export async function getSalesContacts(projectId: number): Promise<SalesContactDto[]> {
  const { data } = await api.get<SalesContactDto[]>(`/sales/projects/${projectId}/contacts`);
  return Array.isArray(data) ? data : [];
}

export async function addSalesContact(
  projectId: number,
  body: { type?: string; result?: string; at?: string },
): Promise<SalesContactDto> {
  const { data } = await api.post<SalesContactDto>(`/sales/projects/${projectId}/contacts`, body);
  return data;
}
