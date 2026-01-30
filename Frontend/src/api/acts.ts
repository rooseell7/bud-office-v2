import api from './api';

// IMPORTANT:
// Backend returns Act entity from bud_office-backend/src/acts/act.entity.ts
// Fields: projectId, foremanId, actDate, items(jsonb), status
export type ActDto = {
  id: number;
  projectId: number;
  foremanId: number;
  actDate: string; // YYYY-MM-DD
  items: any[];
  status: string; // draft/submitted/approved/exported (or custom)
  totalAmount?: number;
  totalCost?: number;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateActDto = {
  projectId: number;
  foremanId?: number;
  actDate: string;
  items?: any[];
  status?: string;
  comment?: string;
};

export type CreateActFromQuoteDto = {
  quoteId: number;
  projectId: number;
  actDate?: string;
};

export type UpdateActDto = Partial<CreateActDto>;

// Базовий список актів:
//   GET /api/acts
export async function getActs(): Promise<ActDto[]> {
  const res = await api.get<ActDto[]>('/acts');
  return res.data;
}

export async function getAct(id: number): Promise<ActDto> {
  const res = await api.get<ActDto>(`/acts/${id}`);
  return res.data;
}

export async function createAct(dto: CreateActDto): Promise<ActDto> {
  const res = await api.post<ActDto>('/acts', dto);
  return res.data;
}

export async function createActFromQuote(dto: CreateActFromQuoteDto): Promise<ActDto> {
  const res = await api.post<ActDto>('/acts/from-quote', dto);
  return res.data;
}

export async function updateAct(id: number, dto: UpdateActDto): Promise<ActDto> {
  const res = await api.patch<ActDto>(`/acts/${id}`, dto);
  return res.data;
}

export async function deleteAct(id: number): Promise<void> {
  await api.delete(`/acts/${id}`);
}