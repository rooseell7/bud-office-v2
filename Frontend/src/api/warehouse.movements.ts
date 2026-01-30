import api from './api'; // your axios instance (src/api/api.ts)

export type MovementType = 'IN' | 'OUT' | 'TRANSFER';

export type MovementItemDto = {
  id?: number;
  materialId?: number | null;
  materialName?: string | null;
  unit?: string | null;
  qty: number;
  price?: number | null;
  amount?: number | null;
};

export type MovementDetailsDto = {
  id: number;
  warehouseId: number;
  type: MovementType;
  docNo?: string | null;
  objectName?: string | null;
  counterpartyName?: string | null;
  note?: string | null;
  createdAt?: string;
  items: MovementItemDto[];

  // Optional for transfer
  toWarehouseId?: number | null;
  toWarehouseName?: string | null;
};

export type CreateWarehouseMovementItemDto = {
  materialId: number;
  qty: number;
  price?: number | null;
  unit?: string | null;
};

export type CreateWarehouseMovementDto = {
  type: MovementType;
  docNo?: string | null;
  objectName?: string | null;
  counterpartyName?: string | null;
  note?: string | null;

  // TRANSFER only
  toWarehouseId?: number | null;

  items: CreateWarehouseMovementItemDto[];
};

export async function getWarehouseMovementById(
  warehouseId: number,
  movementId: number,
): Promise<MovementDetailsDto> {
  const res = await api.get<MovementDetailsDto>(
    `/warehouses/${warehouseId}/movements/${movementId}`,
  );
  return res.data;
}

export async function createWarehouseMovement(
  warehouseId: number,
  dto: CreateWarehouseMovementDto,
): Promise<MovementDetailsDto> {
  const res = await api.post<MovementDetailsDto>(
    `/warehouses/${warehouseId}/movements`,
    dto,
  );
  return res.data;
}