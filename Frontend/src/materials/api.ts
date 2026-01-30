import axios from '../api/axios';
import type { MaterialsListResponse, SortBy, SortDir, MaterialCategory, Unit, CreateMaterialDto, UpdateMaterialDto } from './types';

export type MaterialsQuery = {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: SortBy;
  sortDir?: SortDir;
  categoryId?: number;
  unitId?: number;
  isActive?: boolean;
};

export async function getMaterials(query: MaterialsQuery): Promise<MaterialsListResponse> {
  const { data } = await axios.get('/materials', { params: query });
  return data;
}

export async function getMaterialCategories(): Promise<MaterialCategory[]> {
  const { data } = await axios.get('/materials-dicts/categories');
  return data;
}

export async function getUnits(): Promise<Unit[]> {
  const { data } = await axios.get('/materials-dicts/units');
  return data;
}

export async function importMaterialsExcel(file: File) {
  const form = new FormData();
  form.append('file', file);
  return axios.post('/materials/import/excel', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// -----------------
// Legacy CRUD (використовується старими компонентами src/materials/*)

export async function createMaterial(dto: CreateMaterialDto) {
  const { data } = await axios.post('/materials', dto);
  return data;
}

export async function updateMaterial(id: number, dto: UpdateMaterialDto) {
  const { data } = await axios.patch(`/materials/${id}`, dto);
  return data;
}

export async function deactivateMaterial(id: number) {
  // Бекенд може мати окремий endpoint, але PATCH isActive=false — безпечний дефолт.
  const { data } = await axios.patch(`/materials/${id}`, { isActive: false });
  return data;
}
