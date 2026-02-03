import api from './api';

export type ObjectStatus = 'lead' | 'in_progress' | 'done' | 'archived';

export type ObjectDto = {
  id: number;
  name: string;
  address?: string | null;

  clientId?: number | null;
  clientName?: string | null;
  foremanId?: number | null;
  foremanName?: string | null;

  status?: ObjectStatus | null;

  createdAt?: string;
  updatedAt?: string;
};

export type ForemanCandidate = { id: number; fullName: string };

export async function getForemanCandidates(): Promise<ForemanCandidate[]> {
  const res = await api.get<ForemanCandidate[]>('/objects/foreman-candidates');
  return Array.isArray(res.data) ? res.data : [];
}

// Базовий список об'єктів:
//   GET /api/objects?department=sales|delivery (якщо бек таке підтримує)
// Якщо параметру нема — UI все одно працює, просто покаже загальний список.
export async function getObjects(params?: { department?: 'sales' | 'delivery' }): Promise<ObjectDto[]> {
  const res = await api.get<any>('/objects', { params });
  const data = res.data;
  // Підтримуємо кілька форматів відповіді (масив або {items}):
  if (Array.isArray(data)) return data as ObjectDto[];
  if (data && Array.isArray(data.items)) return data.items as ObjectDto[];
  if (data && Array.isArray(data.data)) return data.data as ObjectDto[];
  return [];
}

export async function updateObject(id: number, payload: Partial<ObjectDto>): Promise<ObjectDto> {
  const res = await api.patch<ObjectDto>(`/objects/${id}`, payload);
  return res.data;
}