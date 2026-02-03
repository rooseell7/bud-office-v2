import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

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
import { ActByIdPage } from './pages/acts/ActByIdPage';
import ActsPage from './pages/acts/ActsPage';

// ✅ Stub pages (нові розділи меню)
import StubPage from './pages/stubs/StubPage';
import AnalyticsOverviewPage from './modules/analytics/pages/AnalyticsOverviewPage';
import AnalyticsProjectsPage from './modules/analytics/pages/AnalyticsProjectsPage';
import AnalyticsFinancePage from './modules/analytics/pages/AnalyticsFinancePage';
import AnalyticsExecutionPage from './modules/analytics/pages/AnalyticsExecutionPage';
// ✅ Фінанси
import FinanceDashboardPage from './modules/finance/pages/FinanceDashboardPage';
import FinanceWalletsPage from './modules/finance/pages/FinanceWalletsPage';
// ✅ Кабінет виконроба
import ForemanObjectsPage from './modules/foreman/pages/ForemanObjectsPage';
import ForemanObjectPage from './modules/foreman/pages/ForemanObjectPage';
// ✅ Відділ реалізації
import ExecutionProjectsPage from './modules/execution/pages/ExecutionProjectsPage';
import ExecutionProjectDetailsPage from './modules/execution/pages/ExecutionProjectDetailsPage';

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
import { ProfilePage } from './pages/profile/ProfilePage';
import ForbiddenPage from './pages/ForbiddenPage';

// ✅ Sheet demo (STEP 0–3 smoke test)
import { SheetDemoPage } from './pages/sheet/SheetDemoPage';
// ✅ КП index + editor
import { EstimateIndexPage } from './pages/estimate/EstimateIndexPage';
import { EstimateByIdPage } from './pages/estimate/EstimateByIdPage';

const RootLayout: React.FC = () => (
  <ProtectedRoute>
    <MainLayout />
  </ProtectedRoute>
);

const App: React.FC = () => {
  const location = useLocation();
  return (
    <Routes>
      {/* Публічний роут */}
      <Route path="/login" element={<LoginPage />} />

      {/* Основний CRM-кабінет — key примушує unmount при зміні маршруту (без location prop) */}
      <Route path="/" element={<RootLayout key={location.key ?? location.pathname} />}>
        {/* ✅ Перша сторінка після логіну */}
        <Route index element={<Navigate to="/home" replace />} />

        {/* ✅ Головна */}
        <Route path="home" element={<HomePage />} />
        {/* ✅ Профіль */}
        <Route path="profile" element={<ProfilePage />} />

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

        {/* ✅ Відділ кошторису */}
        <Route path="estimate" element={<EstimateIndexPage />} />
        <Route path="estimate/objects" element={<ProjectsPage />} />
        <Route path="estimate/objects/:id" element={<ProjectDetailsPage />} />
        <Route path="estimate/acts" element={<ActsPage />} />
        <Route path="estimate/acts/:id" element={<ActByIdPage />} />
        <Route path="estimate/quotes" element={<QuotesPage />} />
        <Route path="estimate/invoices" element={<InvoicesPage />} />
        <Route path="estimate/:id" element={<EstimateByIdPage />} />

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
        <Route path="delivery/acts/:id" element={<ActByIdPage />} />
        <Route path="delivery/:projectId" element={<DeliveryProjectPage />} />

        {/* ✅ Заглушки розділів */}
        <Route path="execution/projects" element={<ExecutionProjectsPage />} />
        <Route path="execution/projects/:id" element={<ExecutionProjectDetailsPage />} />
        <Route path="foreman" element={<ForemanObjectsPage />} />
        <Route path="foreman/objects/:objectId" element={<ForemanObjectPage />} />
        <Route path="finance" element={<FinanceDashboardPage />} />
        <Route path="finance/wallets" element={<FinanceWalletsPage />} />
        <Route path="analytics" element={<AnalyticsOverviewPage />} />
        <Route path="analytics/projects" element={<AnalyticsProjectsPage />} />
        <Route path="analytics/finance" element={<AnalyticsFinancePage />} />
        <Route path="analytics/execution" element={<AnalyticsExecutionPage />} />
      </Route>

      {/* 403 */}
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Адмін-панель */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute anyPermissions={['users:read', 'roles:read']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
      </Route>

      {/* Фолбек */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

export default App;
