export interface MaterialCategory {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  code: string;
  name?: string | null;
}

export interface Material {
  id: number;
  name: string;
  sku?: string | null;
  basePrice: string;
  isActive: boolean;

  categoryId?: number | null;
  unitId?: number | null;

  category?: MaterialCategory | null;
  unitRef?: Unit | null;

  unit?: string | null; // legacy поле (можна прибрати пізніше)
}

export interface MaterialsListResponse {
  items: Material[];
  meta: { page: number; limit: number; total: number; pages: number };
}

// DTOs (legacy форми)
export type CreateMaterialDto = {
  name: string;
  unit: string;
  sku?: string;
  basePrice: number;
};

export type UpdateMaterialDto = Partial<CreateMaterialDto> & {
  isActive?: boolean;
};

export type SortBy = 'name' | 'basePrice' | 'createdAt' | 'updatedAt' | 'isActive';
export type SortDir = 'ASC' | 'DESC';
