import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './modules/auth/LoginPage';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';

// CRM layout + сторінки
import MainLayout from './modules/layout/MainLayout';
import ClientsPage from './modules/clients/ClientsPage';
import ProjectsPage from './modules/projects/ProjectsPage';
import DealsPage from './modules/deals/DealsPage';
import StagesPage from './modules/stages/StagesPage';

// ✅ Sales / КП
import QuotesPage from './modules/sales/QuotesPage';

// ✅ Накладні
import InvoicesPage from './modules/invoices/pages/InvoicesPage';
import InvoiceDetailsPage from './modules/invoices/pages/InvoiceDetailsPage';

// ✅ списки (як у тебе зараз)
import WarehousesPage from './modules/warehouses/WarehousesPage';
import MaterialsPage from './modules/materials/MaterialsPage';

// ✅ Delivery сторінки
import DeliveryIndexPage from './modules/delivery/pages/DeliveryIndexPage';
import DeliveryProjectPage from './modules/delivery/pages/DeliveryProjectPage';
import DeliveryActDetailsPage from './modules/delivery/pages/DeliveryActDetailsPage';
import ActsPage from './pages/acts/ActsPage';

// ✅ Stub pages (нові розділи меню)
import StubPage from './pages/stubs/StubPage';

// ✅ Warehouse details pages (з твого дерева: src/pages/warehouse/*)
import WarehouseDetailsPage from './pages/warehouse/WarehouseDetailsPage';
import MovementDetailsPage from './pages/warehouse/MovementDetailsPage';

// Admin layout + сторінки
import AdminLayout from './modules/layout/AdminLayout';
import AdminDashboardPage from './modules/admin/AdminDashboardPage';
import AdminUsersPage from './modules/admin/AdminUsersPage';
import AdminRolesPage from './modules/admin/AdminRolesPage';

// ✅ Деталі обʼєкта (вкладки: Інфо / Акти / Накладні)
import ProjectDetailsPage from './modules/projects/ProjectDetailsPage';

// ✅ Home (після логіну)
import HomePage from './pages/home/HomePage';

// ✅ Sheet demo (STEP 0–3 smoke test)
import { SheetDemoPage } from './pages/sheet/SheetDemoPage';

const App: React.FC = () => {
  return (
    <Routes>
      {/* Публічний роут */}
      <Route path="/login" element={<LoginPage />} />

      {/* Основний CRM-кабінет */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* ✅ Перша сторінка після логіну */}
        <Route index element={<Navigate to="/home" replace />} />

        {/* ✅ Головна */}
        <Route path="home" element={<HomePage />} />

        {/* ✅ Sheet Grid demo (canonical src/sheet) */}
        <Route path="sheet" element={<SheetDemoPage />} />

        {/* ✅ Warehouses */}
        <Route path="warehouses" element={<WarehousesPage />} />
        {/* ✅ ВАЖЛИВО: детальна сторінка складу */}
        <Route path="warehouses/:id" element={<WarehouseDetailsPage />} />
        {/* ✅ Деталі операції складу */}
        <Route
          path="warehouses/:id/movements/:movementId"
          element={<MovementDetailsPage />}
        />

        <Route path="materials" element={<MaterialsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="sales/quotes" element={<QuotesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        {/* ✅ Обʼєкти (Projects) */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailsPage />} />

        {/* ✅ Відділ кошторису (alias routes) */}
        <Route path="estimate" element={<Navigate to="/estimate/objects" replace />} />
        <Route path="estimate/objects" element={<ProjectsPage />} />
        <Route path="estimate/objects/:id" element={<ProjectDetailsPage />} />
        <Route path="estimate/acts" element={<ActsPage />} />
        <Route path="estimate/quotes" element={<QuotesPage />} />
        <Route path="estimate/invoices" element={<InvoicesPage />} />

        {/* ✅ Відділ постачання (alias routes) */}
        <Route path="supply" element={<Navigate to="/supply/invoices" replace />} />
        <Route path="supply/invoices" element={<InvoicesPage />} />
        <Route path="supply/warehouses" element={<WarehousesPage />} />
        <Route path="supply/materials" element={<MaterialsPage />} />

        {/* ✅ Відділ продажів (alias routes) */}
        <Route path="sales" element={<Navigate to="/sales/clients" replace />} />
        <Route path="sales/clients" element={<ClientsPage />} />
        <Route path="sales/objects" element={<ProjectsPage />} />
        <Route path="sales/objects/:id" element={<ProjectDetailsPage />} />
        <Route path="sales/deals" element={<DealsPage />} />
        {/* sales/quotes вже є як основний */}
        <Route path="deals" element={<DealsPage />} />
        <Route path="stages" element={<StagesPage />} />

        {/* ✅ Delivery */}
        <Route path="delivery" element={<DeliveryIndexPage />} />
        {/* ✅ Глобальний список актів (не project-scoped) */}
        <Route path="delivery/acts" element={<ActsPage />} />
        <Route path="delivery/acts/:id" element={<DeliveryActDetailsPage />} />
        <Route path="delivery/:projectId" element={<DeliveryProjectPage />} />

        {/* ✅ Заглушки розділів */}
        <Route
          path="realization"
          element={<StubPage title="Відділ реалізації" description="Розділ доданий у меню. Реалізацію (виконання робіт) будемо розгортати наступними кроками." />}
        />
        <Route
          path="foreman"
          element={<StubPage title="Кабінет виконроба" description="Розділ доданий у меню. Далі зробимо мінімальний набір: задачі/матеріали/акти по обʼєкту." />}
        />
        <Route
          path="finance"
          element={<StubPage title="Відділ фінансів" description="Розділ доданий у меню. Далі: платежі, оплати постачальникам, звіти." />}
        />
        <Route
          path="analytics"
          element={<StubPage title="Аналітика (для власників)" description="Розділ доданий у меню. Далі: маржа, роботи vs матеріали, динаміка по обʼєктах." />}
        />
      </Route>

      {/* Адмін-панель */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
      </Route>

      {/* Фолбек */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

export default App;
