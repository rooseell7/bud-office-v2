import api from './api';

export type DocumentDto = {
  id: number;
  type: string;
  status: 'draft' | 'final' | 'void' | string;
  projectId?: number | null;
  title?: string | null;
  number?: string | null;
  meta?: any;
  payload?: any;
  sourceType?: string | null;
  sourceId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listDocuments(params: {
  type?: string;
  status?: string;
  projectId?: number;
  sourceType?: string;
  sourceId?: number;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentDto[]> {
  const res = await api.get<any>('/documents', { params });
  const data = res.data;

  // ✅ Backward/forward compatible:
  // - старі реалізації віддавали масив
  // - поточний бек може віддавати пагінований обʼєкт { items, total, limit, offset }
  if (Array.isArray(data)) return data as DocumentDto[];
  if (data && Array.isArray(data.items)) return data.items as DocumentDto[];
  return [];
}

export async function createDocument(dto: Partial<DocumentDto>): Promise<DocumentDto> {
  const res = await api.post<DocumentDto>('/documents', dto);
  return res.data;
}

export async function updateDocument(
  id: number,
  dto: Partial<DocumentDto> & { expectedRevision?: number; editSessionToken?: string },
): Promise<DocumentDto> {
  const res = await api.patch<DocumentDto>(`/documents/${id}`, dto);
  return res.data;
}

export async function acquireEditSession(documentId: number): Promise<{
  token: string;
  expiresAt: string;
  holder: number | null;
}> {
  const res = await api.post(`/documents/${documentId}/edit-session/acquire`);
  return res.data;
}

export async function heartbeatEditSession(
  documentId: number,
  editSessionToken: string,
): Promise<{ ok: boolean }> {
  const res = await api.post(
    `/documents/${documentId}/edit-session/heartbeat`,
    { editSessionToken },
  );
  return res.data;
}

export async function releaseEditSession(
  documentId: number,
  editSessionToken: string,
): Promise<{ ok: boolean }> {
  const res = await api.post(
    `/documents/${documentId}/edit-session/release`,
    { editSessionToken },
  );
  return res.data;
}

export type DocumentVersionDto = {
  id: number;
  documentId: number;
  type: 'auto' | 'manual';
  snapshot?: Record<string, any>;
  note?: string | null;
  createdById?: number | null;
  createdAt: string;
};

export async function listDocumentVersions(
  documentId: number,
): Promise<{ items: DocumentVersionDto[] }> {
  const res = await api.get(`/documents/${documentId}/versions`);
  return res.data;
}

export async function createDocumentVersion(
  documentId: number,
  data: { type?: 'auto' | 'manual'; snapshot: Record<string, any>; note?: string },
): Promise<DocumentVersionDto> {
  const res = await api.post(`/documents/${documentId}/versions`, data);
  return res.data;
}

export async function restoreDocumentVersion(
  documentId: number,
  versionId: number,
): Promise<DocumentDto> {
  const res = await api.post(`/documents/${documentId}/versions/${versionId}/restore`);
  return res.data;
}

export async function getDocument(id: number): Promise<DocumentDto> {
  const res = await api.get<DocumentDto>(`/documents/${id}`);
  return res.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}
