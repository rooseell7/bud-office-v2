import api from '../../api/api';

import type { Client } from '../../clients/types';

/**
 * Clients API
 *
 * Важливо: не використовуємо VITE_API_URL і ручні токени.
 * У проєкті вже є apiClient з baseURL та Bearer token інтерсептором.
 */

export async function fetchClients(): Promise<Client[]> {
  const res = await api.get<Client[]>('/clients');
  return res.data;
}

export async function createClient(dto: Partial<Client>): Promise<Client> {
  const res = await api.post<Client>('/clients', dto);
  return res.data;
}

export async function updateClient(id: string, dto: Partial<Client>): Promise<Client> {
  const res = await api.patch<Client>(`/clients/${id}`, dto);
  return res.data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
