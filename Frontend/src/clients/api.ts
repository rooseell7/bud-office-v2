import apiClient from '../api/apiClient';

import type { Client } from './types';

// В проєкті є єдиний apiClient (baseURL + Bearer token interceptor).
// Тому не покладаємось на VITE_API_URL і не робимо ручний fetch.

export async function fetchClients(): Promise<Client[]> {
  const res = await apiClient.get<Client[]>('/clients');
  return res.data;
}

export async function createClient(dto: { name: string; phone: string; email?: string; note?: string }) {
  const res = await apiClient.post<Client>('/clients', dto);
  return res.data;
}

export async function updateClient(
  id: string,
  dto: Partial<{ name: string; phone: string; email?: string; note?: string }>,
) {
  const res = await apiClient.patch<Client>(`/clients/${id}`, dto);
  return res.data;
}

export async function deleteClient(id: string) {
  await apiClient.delete(`/clients/${id}`);
}
