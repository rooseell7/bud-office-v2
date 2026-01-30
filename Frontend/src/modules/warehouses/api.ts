import api from '../../api/client';
import type { Warehouse } from './types';

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<Warehouse[]>('/warehouses');
  return data;
}
