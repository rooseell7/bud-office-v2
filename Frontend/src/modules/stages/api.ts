import api from '../../api/client';
import type { Stage, StageStatus } from './types';

export async function fetchObjectsForStages() {
  // Мінімально: беремо objects і показуємо name
  const res = await api.get<Array<{ id: string; name: string }>>('/objects');
  return res.data;
}

export async function fetchStages(objectId: string) {
  const res = await api.get<Stage[]>('/stages', { params: { objectId } });
  return res.data;
}

export async function createStage(dto: {
  objectId: string;
  name: string;
  description?: string;
  status?: StageStatus;
  order?: number;
}) {
  const res = await api.post<Stage>('/stages', dto);
  return res.data;
}

export async function updateStage(
  id: string,
  dto: Partial<{
    objectId: string;
    name: string;
    description?: string;
    status: StageStatus;
    order: number;
  }>,
) {
  const res = await api.patch<Stage>(`/stages/${id}`, dto);
  return res.data;
}

export async function deleteStage(id: string) {
  await api.delete(`/stages/${id}`);
}
