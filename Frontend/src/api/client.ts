import axios from 'axios';
import type { LoginDto } from '../modules/auth/types';

import { API_BASE_URL } from '../shared/api/apiClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// -------- Auth --------
export async function login(dto: LoginDto) {
  const { data } = await api.post('/auth/login', dto);
  return data;
}

// -------- Roles --------
export async function fetchRoles() {
  const { data } = await api.get('/roles');
  return data;
}

// -------- Users (Admin) --------
export async function fetchUsers() {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  fullName?: string;
  rolesCodes?: string[];
}) {
  const { data } = await api.post('/admin/users', payload);
  return data;
}

export async function updateUser(
  userId: number,
  payload: {
    fullName?: string;
    email?: string;
    isActive?: boolean;
    rolesCodes?: string[];
  },
) {
  const { data } = await api.patch(`/admin/users/${userId}`, payload);
  return data;
}

export async function setUserRoles(userId: number, rolesCodes: string[]) {
  return updateUser(userId, { rolesCodes });
}

export async function fetchPermissions(): Promise<string[]> {
  const { data } = await api.get<string[]>('/admin/permissions');
  return Array.isArray(data) ? data : [];
}

// -------- Profile (own) --------
export async function updateMyProfile(payload: {
  fullName?: string;
  bio?: string | null;
}) {
  const { data } = await api.patch<{
    id: number;
    email: string;
    fullName: string;
    bio: string | null;
  }>('/users/me', payload);
  return data;
}

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  await api.post('/users/me/change-password', payload);
}

export default api;
