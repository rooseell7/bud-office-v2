import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './modules/auth/LoginPage';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { useAuth } from './modules/auth/AuthContext';
import { RealtimeProvider } from './realtime/RealtimeContext';

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
// ✅ Supply MVP: заявки, замовлення, приходи, до оплати
import SupplyRequestsPage from './modules/supply/pages/SupplyRequestsPage';
import SupplyRequestDetailPage from './modules/supply/pages/SupplyRequestDetailPage';
import SupplyOrdersPage from './modules/supply/pages/SupplyOrdersPage';
import SupplyOrderDetailPage from './modules/supply/pages/SupplyOrderDetailPage';
import SupplyReceiptsPage from './modules/supply/pages/SupplyReceiptsPage';
import SupplyReceiptDetailPage from './modules/supply/pages/SupplyReceiptDetailPage';
import SupplyPayablesPage from './modules/supply/pages/SupplyPayablesPage';
import SupplyPayableDetailPage from './modules/supply/pages/SupplyPayableDetailPage';

// ✅ списки (як у тебе зараз)
import WarehousesPage from './modules/warehouses/WarehousesPage';
import MaterialsPage from './modules/materials/MaterialsPage';

// ✅ Delivery сторінки
import DeliveryIndexPage from './modules/delivery/pages/DeliveryIndexPage';
import DeliveryProjectPage from './modules/delivery/pages/DeliveryProjectPage';
import ActsPage from './pages/acts/ActsPage';

// ✅ Lazy-load: важкі сторінки (Sheet, Analytics, Finance, Admin, Estimate)
const SheetDemoPage = lazy(() => import('./pages/sheet/SheetDemoPage').then((m) => ({ default: m.SheetDemoPage })));
const EstimateIndexPage = lazy(() => import('./pages/estimate/EstimateIndexPage').then((m) => ({ default: m.EstimateIndexPage })));
const EstimateByIdPage = lazy(() => import('./pages/estimate/EstimateByIdPage').then((m) => ({ default: m.EstimateByIdPage })));
const ActByIdPage = lazy(() => import('./pages/acts/ActByIdPage').then((m) => ({ default: m.ActByIdPage })));
const AnalyticsOverviewPage = lazy(() => import('./modules/analytics/pages/AnalyticsOverviewPage').then((m) => ({ default: m.default })));
const AnalyticsProjectsPage = lazy(() => import('./modules/analytics/pages/AnalyticsProjectsPage').then((m) => ({ default: m.default })));
const AnalyticsFinancePage = lazy(() => import('./modules/analytics/pages/AnalyticsFinancePage').then((m) => ({ default: m.default })));
const AnalyticsExecutionPage = lazy(() => import('./modules/analytics/pages/AnalyticsExecutionPage').then((m) => ({ default: m.default })));
const FinanceDashboardPage = lazy(() => import('./modules/finance/pages/FinanceDashboardPage').then((m) => ({ default: m.default })));
const FinanceWalletsPage = lazy(() => import('./modules/finance/pages/FinanceWalletsPage').then((m) => ({ default: m.default })));
const AdminLayout = lazy(() => import('./modules/layout/AdminLayout').then((m) => ({ default: m.default })));
const AdminUsersPage = lazy(() => import('./modules/admin/AdminUsersPage').then((m) => ({ default: m.default })));
const AdminRolesPage = lazy(() => import('./modules/admin/AdminRolesPage').then((m) => ({ default: m.default })));

// ✅ Кабінет виконроба
import ForemanObjectsPage from './modules/foreman/pages/ForemanObjectsPage';
import ForemanObjectPage from './modules/foreman/pages/ForemanObjectPage';
import ForemanActsSubmitPage from './modules/foreman/pages/ForemanActsSubmitPage';
// ✅ Прийом і погодження актів
import EstimateActsIntakePage from './pages/estimate/EstimateActsIntakePage';
import RealizationActsApprovalPage from './modules/realization/pages/RealizationActsApprovalPage';
// ✅ Відділ реалізації
import ExecutionProjectsPage from './modules/execution/pages/ExecutionProjectsPage';
import ExecutionProjectDetailsPage from './modules/execution/pages/ExecutionProjectDetailsPage';

// ✅ Warehouse details pages (з твого дерева: src/pages/warehouse/*)
import WarehouseDetailsPage from './pages/warehouse/WarehouseDetailsPage';
import MovementDetailsPage from './pages/warehouse/MovementDetailsPage';

// ✅ Деталі обʼєкта (вкладки: Інфо / Акти / Накладні)
import ProjectDetailsPage from './modules/projects/ProjectDetailsPage';
import SalesProjectPage from './modules/projects/SalesProjectPage';
import EstimatesProjectPage from './modules/projects/EstimatesProjectPage';
import EstimatesProjectsListPage from './modules/projects/EstimatesProjectsListPage';
import SalesProjectsListPage from './modules/projects/SalesProjectsListPage';
import ProjectCreatePage from './modules/projects/ProjectCreatePage';
import ObjectCreatePage from './modules/projects/ObjectCreatePage';

// ✅ Home (після логіну)
import HomePage from './pages/home/HomePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import ForbiddenPage from './pages/ForbiddenPage';

const PageFallback: React.FC = () => <div style={{ padding: 24, textAlign: 'center' }}>Завантаження…</div>;

const RealtimeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  return <RealtimeProvider token={accessToken}>{children}</RealtimeProvider>;
};

const RootLayout: React.FC = () => (
  <ProtectedRoute>
    <RealtimeWrapper>
      <MainLayout />
    </RealtimeWrapper>
  </ProtectedRoute>
);

const App: React.FC = () => (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      {/* Публічний роут */}
      <Route path="/login" element={<LoginPage />} />

      {/* Основний CRM-кабінет; без key — навігація оновлює лише Outlet, інакше з деяких сторінок (накладні) не переходить */}
      <Route path="/" element={<RootLayout />}>
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
        <Route path="estimates/projects" element={<EstimatesProjectsListPage />} />
        <Route path="estimates/projects/:id" element={<EstimatesProjectPage />} />
        <Route path="estimate/acts" element={<ActsPage />} />
        <Route path="estimate/acts/intake" element={<EstimateActsIntakePage />} />
        <Route path="estimate/acts/:id" element={<ActByIdPage />} />
        <Route path="estimate/quotes" element={<QuotesPage />} />
        <Route path="estimate/invoices" element={<InvoicesPage />} />
        <Route path="estimate/:id" element={<EstimateByIdPage />} />

        {/* ✅ Відділ постачання (Supply MVP + накладні/склади/матеріали) */}
        <Route path="supply" element={<Navigate to="/supply/requests" replace />} />
        <Route path="supply/requests" element={<SupplyRequestsPage />} />
        <Route path="supply/requests/:id" element={<SupplyRequestDetailPage />} />
        <Route path="supply/orders" element={<SupplyOrdersPage />} />
        <Route path="supply/orders/:id" element={<SupplyOrderDetailPage />} />
        <Route path="supply/receipts" element={<SupplyReceiptsPage />} />
        <Route path="supply/receipts/:id" element={<SupplyReceiptDetailPage />} />
        <Route path="supply/payables" element={<SupplyPayablesPage />} />
        <Route path="supply/payables/:id" element={<SupplyPayableDetailPage />} />
        <Route path="supply/invoices" element={<Navigate to="/invoices" replace />} />
        <Route path="supply/warehouses" element={<WarehousesPage />} />
        <Route path="supply/materials" element={<MaterialsPage />} />

        {/* ✅ Відділ продажів (alias routes) */}
        <Route path="sales" element={<Navigate to="/sales/clients" replace />} />
        <Route path="sales/clients" element={<ClientsPage />} />
        <Route path="sales/objects" element={<ProjectsPage />} />
        <Route path="sales/objects/new" element={<ObjectCreatePage />} />
        <Route path="sales/objects/:id" element={<ProjectDetailsPage />} />
        <Route path="sales/projects" element={<SalesProjectsListPage />} />
        <Route path="sales/projects/new" element={<ProjectCreatePage />} />
        <Route path="sales/projects/:id" element={<SalesProjectPage />} />
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
        <Route path="realization/acts/approval" element={<RealizationActsApprovalPage />} />
        <Route path="foreman" element={<ForemanObjectsPage />} />
        <Route path="foreman/objects/:objectId" element={<ForemanObjectPage />} />
        <Route path="foreman/acts/submit" element={<ForemanActsSubmitPage />} />
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
    </Suspense>
);

export default App;
