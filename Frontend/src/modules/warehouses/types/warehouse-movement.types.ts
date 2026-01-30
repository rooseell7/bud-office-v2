export type Id = number;

export type MovementType = 'IN' | 'OUT' | 'TRANSFER';

export type WarehouseRef = {
  id: Id;
  name?: string;
};

export type ObjectRef = {
  id: Id;
  name?: string;
};

export type UserRef = {
  id: Id;
  fullName?: string;
  email?: string;
};

export type MaterialRef = {
  id: Id;
  name?: string;
  unit?: string;
};

export type WarehouseMovementItem = {
  id?: Id;
  movementId: Id;
  materialId: Id;
  qty: string;    // numeric stored as string from backend
  price: string;  // numeric stored as string from backend
  amount: string; // numeric stored as string from backend
  material?: MaterialRef;
};

export type WarehouseMovement = {
  id: Id;
  type: MovementType;

  fromWarehouseId: Id | null;
  toWarehouseId: Id | null;

  objectId: Id | null;

  userId: Id;
  createdAt: string;

  fromWarehouse?: WarehouseRef | null;
  toWarehouse?: WarehouseRef | null;
  object?: ObjectRef | null;
  user?: UserRef;

  items?: WarehouseMovementItem[];
};

export type WarehouseMovementsQuery = {
  type?: MovementType;
  materialId?: Id;
  objectId?: Id;
  fromWarehouseId?: Id;
  toWarehouseId?: Id;
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
  offset?: number;
  limit?: number;
};

export type PagedResult<T> = {
  total: number;
  limit: number;
  offset: number;
  items: T[];
};