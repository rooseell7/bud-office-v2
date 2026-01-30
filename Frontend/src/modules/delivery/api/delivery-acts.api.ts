import { apiClient } from '../../../shared/api/apiClient';

import type {
  DeliveryAct,
  CreateDeliveryActDto,
  UpdateDeliveryActDto,
  Id,
} from '../types/act.types';

/**
 * BACKEND ROUTES (confirmed):
 * GET    /api/delivery/acts?projectId=ID
 * POST   /api/delivery/acts
 * PATCH  /api/delivery/acts/:id
 * DELETE /api/delivery/acts/:id
 */

export async function getActs(projectId: Id): Promise<DeliveryAct[]> {
  const { data } = await apiClient.get('/delivery/acts', {
    params: { projectId },
  });

  return Array.isArray(data) ? data : [];
}

export async function getAct(id: Id): Promise<DeliveryAct> {
  const { data } = await apiClient.get(`/delivery/acts/${id}`);
  return data as DeliveryAct;
}

export async function createAct(
  projectId: Id,
  dto: Omit<CreateDeliveryActDto, 'projectId'>,
): Promise<DeliveryAct> {
  const payload: CreateDeliveryActDto = { projectId, ...dto };
  const { data } = await apiClient.post('/delivery/acts', payload);
  return data as DeliveryAct;
}

export async function updateAct(
  id: Id,
  dto: UpdateDeliveryActDto,
): Promise<DeliveryAct> {
  const { data } = await apiClient.patch(`/delivery/acts/${id}`, dto);
  return data as DeliveryAct;
}

export async function deleteAct(id: Id): Promise<void> {
  await apiClient.delete(`/delivery/acts/${id}`);
}
