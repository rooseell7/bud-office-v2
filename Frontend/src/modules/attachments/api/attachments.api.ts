import api from '../../../api/api';
import type { Attachment } from '../types/attachment.types';

export async function listAttachments(params: { entityType: string; entityId: number }): Promise<Attachment[]> {
  const { data } = await api.get('/attachments', { params });
  return data;
}

export async function uploadAttachment(dto: { entityType: string; entityId: number; kind?: string }, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('entityType', dto.entityType);
  form.append('entityId', String(dto.entityId));
  if (dto.kind) form.append('kind', dto.kind);
  form.append('file', file);

  // IMPORTANT: do NOT set Content-Type manually for FormData in the browser.
  // Axios will set the correct multipart boundary automatically.
  const { data } = await api.post('/attachments/upload', form);
  return data;
}

export async function deleteAttachment(id: number): Promise<{ ok: true }> {
  const { data } = await api.delete(`/attachments/${id}`);
  return data;
}

export async function downloadAttachment(id: number, filename?: string): Promise<void> {
  const res = await api.get(`/attachments/${id}/download`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `file_${id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
