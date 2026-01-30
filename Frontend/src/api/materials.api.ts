import api from './client';

export interface Material {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
}

export async function getMaterials() {
  const { data } = await api.get('/materials');
  return data;
}

export async function archiveMaterial(id: string) {
  await api.post(`/materials/${id}/archive`);
}
