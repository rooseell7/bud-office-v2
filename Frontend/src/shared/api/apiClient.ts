// FILE: buduy-crm-frontend/src/shared/api/apiClient.ts

import axios from 'axios';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_URL ?? '') ||
  'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function hardLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  // глобальна подія, яку слухає AuthContext
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: '401' } }));
}

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      hardLogout();
    }
    return Promise.reject(error);
  },
);
