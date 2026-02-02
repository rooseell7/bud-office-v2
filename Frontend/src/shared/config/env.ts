/**
 * Canonical URL resolver for REST API and WebSocket (Socket.IO).
 * Single source of truth. WS never connects to localhost:5173 (Vite dev).
 */

const _env = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};

function trim(s: string | undefined): string {
  return (s ?? '').trim();
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

/** Current origin (browser only) */
export const origin =
  typeof window !== 'undefined' ? window.location.origin : '';

/** Build mode: true when vite build --mode production */
export const isProdLike = _env?.PROD === true;

/** Діагностика навігації: VITE_DEBUG_NAV=1 у .env.local, або у dev за замовчуванням */
export const DEBUG_NAV =
  _env?.VITE_DEBUG_NAV === '1' || (_env?.DEV === true && _env?.VITE_DEBUG_NAV !== '0');

/** Vite dev: origin includes port 5173 */
function isDevOrigin(): boolean {
  return typeof origin === 'string' && (origin.includes('5173') || /localhost:5173/.test(origin));
}

function resolveApiBaseUrl(): string {
  const envApi = trim(_env?.VITE_API_URL);
  if (envApi) {
    if (envApi.startsWith('/')) return envApi;
    return stripTrailingSlash(envApi);
  }
  return 'http://localhost:3000/api';
}

function resolveWsBaseUrl(): string {
  const envWs = trim(_env?.VITE_WS_URL);
  if (envWs) {
    const ws = envWs === '/' ? '' : stripTrailingSlash(envWs);
    if (ws && (/5173/.test(ws) || (typeof window !== 'undefined' && ws === origin && isDevOrigin()))) {
      return 'http://localhost:3000';
    }
    return ws;
  }

  const envApi = trim(_env?.VITE_API_URL);
  if (envApi) {
    if (envApi.startsWith('/')) return origin || '';
    const base = envApi.replace(/\/api\/?$/, '') || envApi;
    const ws = stripTrailingSlash(base);
    if (/5173/.test(ws)) return 'http://localhost:3000';
    return ws;
  }

  if (typeof window !== 'undefined') {
    if (isDevOrigin()) return 'http://localhost:3000';
    return origin || '';
  }

  return '';
}

/** REST API base URL */
export const apiBaseUrl = resolveApiBaseUrl();

/** Socket.IO base URL. Never points to localhost:5173. */
export const wsBaseUrl = resolveWsBaseUrl();
