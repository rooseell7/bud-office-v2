import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ✅ ВАЖЛИВО: у твоєму дереві src/shared є, а AuthContext лежить у src/modules/auth/context,
// тому потрібно піднятися на 3 рівні вгору до src:
import { apiClient } from '../../../shared/api/apiClient';

// ✅ У тебе є файл: src/modules/auth/types.ts
import type { User } from '../types';

import { buildPermissionHelpers } from '../permissions';

type AuthContextType = {
  user: User | null;
  /** JWT for API + WS (same source as apiClient) */
  accessToken: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  // для UI
  roles: string[];
  permissions: string[];

  // actions
  login: (dto: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;

  // permissions helpers (єдиний стандарт)
  can: (code: string) => boolean;
  canAny: (codes: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Очікування:
 * - POST /auth/login -> { accessToken: string }
 * - GET  /auth/me    -> user { ..., roles?, permissions? }
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => safeJsonParse<User>(localStorage.getItem('user')));
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const roles = useMemo(() => {
    const r = (user as any)?.roles;
    return Array.isArray(r) ? r.map((x) => String(x?.code ?? x)).filter(Boolean) : [];
  }, [user]);

  const permissionsArr = useMemo(() => {
    const p = (user as any)?.permissions;
    return Array.isArray(p) ? p.map((x) => String(x?.code ?? x)).filter(Boolean) : [];
  }, [user]);

  const { can, canAny, list } = useMemo(() => buildPermissionHelpers(permissionsArr), [permissionsArr]);

  const isAuthenticated = Boolean(accessToken && user);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }, []);

  const refreshMe = useCallback(async () => {
    if (!accessToken) return;

    try {
      const me = await apiClient.get<User>('/auth/me');
      setUser(me.data);
      localStorage.setItem('user', JSON.stringify(me.data));
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        logout();
        return;
      }
    }
  }, [accessToken, logout]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (accessToken) {
          // Завжди підтягувати свіжі дані з /auth/me (roles, permissions), щоб уникнути застарілого localStorage.
          await refreshMe();
        }
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [accessToken, refreshMe]);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (dto: { email: string; password: string }) => {
    const res = await apiClient.post<{ accessToken: string }>('/auth/login', dto);
    const token = res.data?.accessToken;

    if (!token) {
      throw new Error('Не отримано accessToken.');
    }

    setAccessToken(token);
    localStorage.setItem('accessToken', token);

    const me = await apiClient.get<User>('/auth/me');
    setUser(me.data);
    localStorage.setItem('user', JSON.stringify(me.data));
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isAuthLoading,
      roles,
      permissions: list, // ✅ normalized
      login,
      logout,
      refreshMe,
      can,
      canAny,
    }),
    [user, accessToken, isAuthenticated, isAuthLoading, roles, list, login, logout, refreshMe, can, canAny],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>.');
  return ctx;
}