/**
 * LEGACY: NOT USED. Source of truth: src/App.tsx. Do not modify.
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import { useAuth } from '../../modules/auth/AuthContext';

import AppLayout from '../../layouts/AppLayout';

import WarehousePage from '../../pages/warehouse/WarehousePage';

// Lazy-load детальної сторінки складу
const WarehouseDetailsPage = React.lazy(() =>
  import('../../pages/warehouse/WarehouseDetailsPage').then((m) => ({
    default: m.WarehouseDetailsPage,
  })),
);

// Lazy-load деталки операції
const MovementDetailsPage = React.lazy(() =>
  import('../../pages/warehouse/MovementDetailsPage').then((m) => ({
    default: m.default,
  })),
);

// Lazy-load сторінки клієнтів
const ClientsPage = React.lazy(() =>
  import('../../modules/clients/ClientsPage').then((m) => ({
    default: m.default,
  })),
);

// =====================
// NEW: lazy-load розділів
// =====================
const MaterialsPage = React.lazy(() =>
  import('../../pages/materials/MaterialsPage').then((m) => ({
    default: m.MaterialsPage,
  })),
);

const InvoicesPage = React.lazy(() =>
  import('../../modules/supply/pages/InvoicesPage').then((m) => ({
    default: m.InvoicesPage,
  })),
);

const ObjectsPage = React.lazy(() =>
  import('../../pages/objects/ObjectsPage').then((m) => ({
    default: m.default,
  })),
);

const ActsPage = React.lazy(() =>
  import('../../pages/acts/ActsPage').then((m) => ({
    default: m.ActsPage,
  })),
);

const DealsPage = React.lazy(() =>
  import('../../modules/deals/DealsPage').then((m) => ({
    default: m.default,
  })),
);

const ProjectsPage = React.lazy(() =>
  import('../../modules/projects/ProjectsPage').then((m) => ({
    default: m.default,
  })),
);

/** Редірект: /warehouses/:id -> /supply/warehouses/:id */
const WarehouseDetailsRedirect: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/supply/warehouses/${id ?? ''}`} replace />;
};

/** Редірект: /warehouses/:id/movements/:movementId -> /supply/warehouses/:id/movements/:movementId */
const MovementDetailsRedirect: React.FC = () => {
  const { id, movementId } = useParams();
  return (
    <Navigate
      to={`/supply/warehouses/${id ?? ''}/movements/${movementId ?? ''}`}
      replace
    />
  );
};

export const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Завантаження…</div>}>
      <Routes>
        {/* Layout обгортає всі внутрішні сторінки */}
        <Route element={<AppLayout />}>
          {/* =========================
              ПОСТАЧАННЯ (Supply)
             ========================= */}
          <Route path="/supply/warehouses" element={<WarehousePage />} />
          <Route path="/supply/warehouses/:id" element={<WarehouseDetailsPage />} />
          <Route
            path="/supply/warehouses/:id/movements/:movementId"
            element={<MovementDetailsPage />}
          />
          <Route path="/supply/materials" element={<MaterialsPage />} />
          <Route path="/supply/invoices" element={<InvoicesPage />} />

          {/* =========================
              ПРОДАЖІ (Sales)
             ========================= */}
          <Route path="/sales/clients" element={<ClientsPage />} />
          <Route path="/sales/deals" element={<DealsPage />} />
          <Route path="/sales/projects" element={<ProjectsPage />} />

          {/* =========================
              КОШТОРИСИ (Estimation)
             ========================= */}
          <Route path="/estimate/objects" element={<ObjectsPage mode="sales" />} />
          <Route path="/estimate/acts" element={<ActsPage />} />

          {/* =========================
              РЕДІРЕКТИ ЗІ СТАРИХ ШЛЯХІВ
             ========================= */}
          <Route path="/warehouses" element={<Navigate to="/supply/warehouses" replace />} />
          <Route path="/warehouses/:id" element={<WarehouseDetailsRedirect />} />
          <Route
            path="/warehouses/:id/movements/:movementId"
            element={<MovementDetailsRedirect />}
          />

          <Route path="/clients" element={<Navigate to="/sales/clients" replace />} />

          {/* Старі шляхи (збереження сумісності) */}
          <Route path="/sales/objects" element={<Navigate to="/estimate/objects" replace />} />
          <Route path="/delivery/objects" element={<Navigate to="/estimate/objects" replace />} />
          <Route path="/delivery/acts" element={<Navigate to="/estimate/acts" replace />} />
          <Route path="/projects" element={<Navigate to="/sales/projects" replace />} />
          <Route path="/deals" element={<Navigate to="/sales/deals" replace />} />

          {/* Корінь та fallback */}
          <Route path="/" element={<Navigate to="/supply/warehouses" replace />} />
          <Route path="*" element={<Navigate to="/supply/warehouses" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
