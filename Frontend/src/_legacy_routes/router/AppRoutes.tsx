/**
 * LEGACY: NOT USED. Source of truth: src/App.tsx. Do not modify.
 */

import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from '../../pages/NotFoundPage';

import LoginPage from '../../auth/pages/LoginPage';

// Delivery
import DeliveryIndexPage from '../../modules/delivery/pages/DeliveryIndexPage';
import DeliveryProjectPage from '../../modules/delivery/pages/DeliveryProjectPage';

// Warehouses (УВАГА: у тебе файл саме WarehousePage.tsx)
import WarehousePage from '../../pages/warehouse/WarehousePage';
import WarehouseDetailsPage from '../../pages/warehouse/WarehouseDetailsPage';
import MovementDetailsPage from '../../pages/warehouse/MovementDetailsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/warehouses" replace />} />

      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Delivery */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute>
            <DeliveryIndexPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery/:projectId"
        element={
          <ProtectedRoute>
            <DeliveryProjectPage />
          </ProtectedRoute>
        }
      />

      {/* Warehouses */}
      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <WarehousePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouses/:id"
        element={
          <ProtectedRoute>
            <WarehouseDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouses/:id/movements/:movementId"
        element={
          <ProtectedRoute>
            <MovementDetailsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
