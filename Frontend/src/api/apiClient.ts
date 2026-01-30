import axios from 'axios';

// Базовий URL: або з Vite env, або дефолт
// Піджени під свій env, якщо потрібно (наприклад VITE_API_URL)
const baseURL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_BACKEND_URL ||
  'http://localhost:3000';

const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Детермінована поведінка: якщо токен невалідний/прострочений —
      // очищаємо сесію і переводимо на /login, щоб не лишати UI в "вічному loading".
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default apiClient;