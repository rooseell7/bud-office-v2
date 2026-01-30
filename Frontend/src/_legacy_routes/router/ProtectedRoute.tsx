/**
 * LEGACY: NOT USED. Source of truth: src/App.tsx. Do not modify.
 */

import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// ЄДИНЕ джерело правди по auth
import { useAuth } from '../../modules/auth/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const auth = useAuth();
  const location = useLocation();

  // У твоєму AuthContextType гарантовано є isAuthenticated (як мінімум)
  const isAuthenticated = Boolean((auth as any)?.isAuthenticated);

  // Опційно: якщо у твоєму контексті є фаза ініціалізації (/auth/me),
  // то ці поля можуть існувати або з'явитися пізніше. Не ламаємо TS.
  const isLoading = Boolean(
    (auth as any)?.isLoading ??
      (auth as any)?.loading ??
      (auth as any)?.initializing ??
      (auth as any)?.isInitializing ??
      false,
  );

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
