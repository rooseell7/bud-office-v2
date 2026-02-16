/**
 * STEP 7: Server drafts API.
 */
import api from '../../api/api';

/** APPENDIX D: Draft keys (STRICT). */
export function buildDraftKey(params: {
  entityType: string;
  mode: 'create' | 'edit';
  projectId: number;
  entityId?: string | null;
}): string {
  const { entityType, mode, projectId, entityId } = params;
  const base = `draft:${entityType}:${mode}:project:${projectId}`;
  return entityId != null ? `${base}:${entityId}` : base;
}

export type DraftResponse = {
  payload: Record<string, unknown>;
  updatedAt: string;
} | null;

export async function loadDraft(key: string): Promise<DraftResponse> {
  const res = await api.get<DraftResponse>('/drafts', { params: { key } });
  return res.data ?? null;
}

export async function saveDraft(params: {
  key: string;
  payload: Record<string, unknown>;
  projectId?: number | null;
  entityType: string;
  entityId?: string | null;
  scopeType?: 'global' | 'project' | 'entity';
}): Promise<void> {
  await api.put('/drafts', {
    payload: params.payload,
    projectId: params.projectId ?? undefined,
    entityType: params.entityType,
    entityId: params.entityId ?? undefined,
    scopeType: params.scopeType ?? 'project',
  }, {
    params: { key: params.key },
  });
}

export async function clearDraft(key: string): Promise<void> {
  await api.delete('/drafts', { params: { key } });
}
