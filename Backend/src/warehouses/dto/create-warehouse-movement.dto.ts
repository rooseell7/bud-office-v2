export type MovementType = 'IN' | 'OUT' | 'TRANSFER';

export type CreateWarehouseMovementItemDto = {
  materialId: number;
  qty: number;
  price?: number | null;
  unit?: string | null;
};

export class CreateWarehouseMovementDto {
  type: MovementType;

  docNo?: string | null;
  objectName?: string | null;
  counterpartyName?: string | null;
  note?: string | null;

  // TRANSFER only
  toWarehouseId?: number | null;

  items: CreateWarehouseMovementItemDto[];
}
