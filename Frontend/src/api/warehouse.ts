import api from './api';

export type WarehouseBalanceRow = {
  id: number;
  warehouseId?: number;
  materialId?: number;
  qty: number | string;
  unit?: string | null;

  material?: { id: number; name: string } | null;
  warehouse?: { id: number; name: string } | null;
};

export type WarehouseMovementRow = {
  id: number;
  type?: string | null;
  qty?: number | string | null;
  unit?: string | null;
  createdAt?: string | null;

  material?: { id: number; name: string } | null;
  fromWarehouse?: { id: number; name: string } | null;
  toWarehouse?: { id: number; name: string } | null;
  createdBy?: { id: number; name?: string | null } | null;

  comment?: string | null;
};

export async function getWarehouseBalance(id: number): Promise<WarehouseBalanceRow[]> {
  const res = await api.get(`/warehouses/${id}/balances`);
  return res.data as WarehouseBalanceRow[];
}

export async function getWarehouseMovements(id: number): Promise<WarehouseMovementRow[]> {
  const res = await api.get(`/warehouses/${id}/movements`);
  return res.data as WarehouseMovementRow[];
}
