import api from './api';

export type ObjectStatus = 'lead' | 'in_progress' | 'done' | 'archived';

export type ObjectDto = {
  id: number;
  name: string;
  address?: string | null;

  clientId?: number | null;
  clientName?: string | null;

  status?: ObjectStatus | null;

  createdAt?: string;
  updatedAt?: string;
};

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