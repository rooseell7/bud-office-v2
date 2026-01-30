import axios from 'axios';

import { API_BASE_URL } from '../shared/api/apiClient';

const baseURL =
  (import.meta as any).env?.VITE_API_URL?.trim() ||
  API_BASE_URL;

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
