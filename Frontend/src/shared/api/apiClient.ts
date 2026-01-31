// FILE: buduy-crm-frontend/src/shared/api/apiClient.ts

import axios from 'axios';
import { apiBaseUrl } from '../config/env';

export const API_BASE_URL = apiBaseUrl;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
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
