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
  const { data } = await api.get('/users');
  return data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  fullName: string;
  rolesCodes?: string[];
}) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function setUserRoles(userId: number, rolesCodes: string[]) {
  const { data } = await api.patch(`/users/${userId}/roles`, { rolesCodes });
  return data;
}

export default api;
