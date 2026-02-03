import api from './api';

export type WalletDto = {
  id: number;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
  details: string | null;
  balance?: number;
  balanceUAH?: number;
};

export type BalanceDto = {
  walletId: number;
  walletName: string;
  currency: string;
  balance: number;
  balanceUAH: number;
};

export type TransactionDto = {
  id: number;
  type: string;
  date: string;
  walletId: number | null;
  fromWalletId: number | null;
  toWalletId: number | null;
  amount: number;
  currency: string;
  fxRate: number | null;
  amountUAH: number | null;
  projectId: number | null;
  categoryId: number | null;
  counterparty: string | null;
  comment: string | null;
  createdAt: string;
};

export type CategoryDto = { id: number; name: string; direction: string; isActive: boolean };

export type ProjectSummaryDto = { inUAH: number; outUAH: number; balanceUAH: number };

export async function getWallets(all?: boolean): Promise<WalletDto[]> {
  const res = await api.get<WalletDto[]>('/finance/wallets', { params: all ? { all: '1' } : {} });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createWallet(dto: {
  name: string;
  type?: string;
  currency: string;
  isActive?: boolean;
  details?: string | null;
}): Promise<WalletDto> {
  const res = await api.post<WalletDto>('/finance/wallets', dto);
  return res.data;
}

export async function updateWallet(
  id: number,
  dto: Partial<{ name: string; type: string; currency: string; isActive: boolean; details: string | null }>,
): Promise<WalletDto> {
  const res = await api.patch<WalletDto>(`/finance/wallets/${id}`, dto);
  return res.data;
}

export async function getCategories(direction?: 'in' | 'out'): Promise<CategoryDto[]> {
  const res = await api.get<CategoryDto[]>('/finance/categories', { params: direction ? { direction } : {} });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getBalances(): Promise<BalanceDto[]> {
  const res = await api.get<BalanceDto[]>('/finance/balances');
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTransactions(params?: {
  fromDate?: string;
  toDate?: string;
  walletId?: number;
  projectId?: number;
  categoryId?: number;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: TransactionDto[]; total: number }> {
  const res = await api.get<{ items: TransactionDto[]; total: number }>('/finance/transactions', {
    params: params ?? {},
  });
  return res.data ?? { items: [], total: 0 };
}

export async function createTransactionIn(dto: {
  date: string;
  walletId: number;
  amount: number;
  currency: string;
  fxRate?: number | null;
  amountUAH?: number | null;
  projectId?: number | null;
  categoryId?: number | null;
  counterparty?: string | null;
  comment?: string | null;
}): Promise<TransactionDto> {
  const res = await api.post<TransactionDto>('/finance/transactions/in', dto);
  return res.data;
}

export async function createTransactionOut(dto: {
  date: string;
  walletId: number;
  amount: number;
  currency: string;
  fxRate?: number | null;
  amountUAH?: number | null;
  projectId?: number | null;
  categoryId?: number | null;
  counterparty?: string | null;
  comment?: string | null;
}): Promise<TransactionDto> {
  const res = await api.post<TransactionDto>('/finance/transactions/out', dto);
  return res.data;
}

export async function createTransactionTransfer(dto: {
  date: string;
  fromWalletId: number;
  toWalletId: number;
  amount: number;
  currency: string;
  fxRate?: number | null;
  amountUAH?: number | null;
  comment?: string | null;
}): Promise<TransactionDto> {
  const res = await api.post<TransactionDto>('/finance/transactions/transfer', dto);
  return res.data;
}

export async function updateTransaction(
  id: number,
  dto: Partial<{
    date: string;
    walletId: number | null;
    amount: number;
    currency: string;
    fxRate: number | null;
    amountUAH: number | null;
    projectId: number | null;
    categoryId: number | null;
    counterparty: string | null;
    comment: string | null;
  }>,
): Promise<TransactionDto> {
  const res = await api.patch<TransactionDto>(`/finance/transactions/${id}`, dto);
  return res.data;
}

export async function getProjectSummary(projectId: number): Promise<ProjectSummaryDto> {
  const res = await api.get<ProjectSummaryDto>(`/finance/projects/${projectId}/summary`);
  return res.data;
}
