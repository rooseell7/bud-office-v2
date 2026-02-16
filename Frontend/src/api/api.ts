import axios from 'axios';

import { API_BASE_URL } from '../shared/api/apiClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  const method = (config.method || '').toLowerCase();
  if (['post', 'patch', 'put', 'delete'].includes(method)) {
    config.headers = config.headers || {};
    config.headers['x-client-op-id'] =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Детемінована поведінка: якщо токен невалідний/прострочений —
      // очищаємо сесію і переводимо на /login, щоб не лишати UI у "вічному loading".
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
