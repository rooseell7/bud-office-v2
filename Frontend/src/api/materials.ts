import api from './api';

export type MaterialDto = {
  id: number;
  name: string;
  unit?: string | null;
  basePrice?: number | string | null;
  consumptionPerM2?: number | string | null;
  consumptionPerLm?: number | string | null;
  weightKg?: number | string | null;
  isActive?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

type PagedMaterialsResponse = {
  items: MaterialDto[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

// Базові ендпоінти (за замовчуванням):
//   GET /api/materials
// Якщо в бекенді інший шлях — просто змінимо URL тут, а UI залишиться.
export async function getMaterials(): Promise<MaterialDto[]> {
  const res = await api.get<MaterialDto[] | PagedMaterialsResponse>('/materials');
  const data: any = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export type CreateMaterialDto = {
  name: string;
  unit?: string | null;
  sku?: string | null;
  basePrice?: number;
  consumptionPerM2?: number;
  consumptionPerLm?: number;
  weightKg?: number;
  categoryId?: number | null;
  unitId?: number | null;
};

export async function createMaterial(dto: CreateMaterialDto): Promise<MaterialDto> {
  const res = await api.post<MaterialDto>('/materials', dto);
  return res.data;
}

export type UpdateMaterialDto = Partial<CreateMaterialDto> & {
  isActive?: boolean;
  name?: string;
  unit?: string | null;
};

export async function updateMaterial(id: number, dto: UpdateMaterialDto): Promise<MaterialDto> {
  const res = await api.patch<MaterialDto>(`/materials/${id}`, dto);
  return res.data;
}