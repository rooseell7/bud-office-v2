import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// ✅ Канонічний контекст (той самий, який використовується в main.tsx)
import { useAuth } from '../modules/auth/context/AuthContext';

type Props = {
  permission?: string;
  anyPermissions?: string[];
  redirectTo?: string;
};

const ProtectedRoute: React.FC<Props> = ({
  permission,
  anyPermissions,
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const { isAuthenticated, user, can, canAny } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />;
  }

  if (anyPermissions && anyPermissions.length && !canAny(anyPermissions)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;