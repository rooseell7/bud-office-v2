import api from './api';

export type OwnerOverviewDto = {
  kpi: {
    incomeUAH: number;
    expenseUAH: number;
    netUAH: number;
    cashOnHandUAH: number;
    activeProjectsCount: number;
    overdueTasksCount: number;
    blockedTasksCount: number;
  };
  cashflowSeries: Array<{ dateBucket: string; incomeUAH: number; expenseUAH: number }>;
  expenseByCategory: Array<{ categoryId: number; categoryName: string; amountUAH: number }>;
  revenueByProject: Array<{ projectId: number; projectName: string; incomeUAH: number }>;
  projectStatusDistribution: Array<{ status: string; count: number }>;
  taskStatusDistribution: Array<{ status: string; count: number }>;
  dataQuality: {
    transactionsWithoutProjectPct: number;
    transactionsWithoutCategoryPct: number;
    tasksWithoutDueDatePct: number;
    projectsWithoutForemanPct: number;
    stagesWithoutDatesPct: number;
  };
};

export type ProjectPerformanceDto = {
  projectId: number;
  projectName: string;
  status: string;
  foremanName: string | null;
  incomeUAH: number;
  expenseUAH: number;
  netUAH: number;
  openTasksCount: number;
  blockedTasksCount: number;
  overdueTasksCount: number;
  isOverdue: boolean;
};

export type FinanceBreakdownDto = {
  byWallet: Array<{ walletId: number; walletName: string; inUAH: number; outUAH: number; netUAH: number }>;
  byCategory: Array<{ categoryId: number; categoryName: string; amountUAH: number }>;
  topCounterparties: Array<{ counterparty: string; amountUAH: number; count: number }>;
  balances: Array<{ walletId: number; walletName: string; balanceUAH: number }>;
};

export type ExecutionHealthDto = {
  activeProjectsCount: number;
  pausedProjectsCount: number;
  overdueTasksCount: number;
  blockedTasksCount: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  topBlockedReasons: Array<{ reason: string; count: number }>;
};

export type AnalyticsParams = {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'week' | 'month';
  projectId?: number;
  walletId?: number;
  foremanId?: string;
  status?: string;
  sort?: string;
};

function toParams(p: AnalyticsParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.from) out.from = p.from;
  if (p.to) out.to = p.to;
  if (p.groupBy) out.groupBy = p.groupBy;
  if (p.projectId != null) out.projectId = String(p.projectId);
  if (p.walletId != null) out.walletId = String(p.walletId);
  if (p.foremanId) out.foremanId = p.foremanId;
  if (p.status) out.status = p.status;
  if (p.sort) out.sort = p.sort;
  return out;
}

export async function getOwnerOverview(params?: AnalyticsParams): Promise<OwnerOverviewDto> {
  const res = await api.get<OwnerOverviewDto>('/analytics/owner/overview', { params: toParams(params ?? {}) });
  return res.data;
}

export async function getProjectsPerformance(params?: AnalyticsParams): Promise<ProjectPerformanceDto[]> {
  const res = await api.get<ProjectPerformanceDto[]>('/analytics/projects/performance', { params: toParams(params ?? {}) });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getFinanceBreakdown(params?: AnalyticsParams): Promise<FinanceBreakdownDto> {
  const res = await api.get<FinanceBreakdownDto>('/analytics/finance/breakdown', { params: toParams(params ?? {}) });
  return res.data;
}

export async function getExecutionHealth(params?: AnalyticsParams): Promise<ExecutionHealthDto> {
  const res = await api.get<ExecutionHealthDto>('/analytics/execution/health', { params: toParams(params ?? {}) });
  return res.data;
}
