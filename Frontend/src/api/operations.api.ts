import api from './client';

export interface Operation {
  id: string;
  type: 'IN' | 'OUT';
  materialName: string;
  quantity: number;
  createdAt: string;
}

export async function getOperations(warehouseId: string) {
  const { data } = await api.get('/operations', {
    params: { warehouseId },
  });
  return data;
}
