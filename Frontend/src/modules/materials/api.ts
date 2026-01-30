import api from '../../api/client';
import type { Material } from './types';

export async function getMaterials(): Promise<Material[]> {
  const { data } = await api.get<Material[]>('/materials');
  return data;
}
