export type Id = number;

export type DeliveryActStatus = 'draft' | 'done';

export type DeliveryActItem = {
  id: Id;
  name: string;
  unit: string;
  qty: number;
  price: number;
  amount: number;
};

export type DeliveryAct = {
  id: Id;
  projectId: Id;
  status: DeliveryActStatus;

  number?: string | null;
  date?: string | null; // YYYY-MM-DD
  comment?: string | null;

  totalAmount?: number | null;

  items?: DeliveryActItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateDeliveryActDto = {
  projectId: Id;

  number?: string | null;
  date?: string | null;
  comment?: string | null;

  items?: Array<{
    name: string;
    unit: string;
    qty: number;
    price: number;
  }>;
};

export type UpdateDeliveryActDto = {
  status?: DeliveryActStatus;

  number?: string | null;
  date?: string | null;
  comment?: string | null;

  items?: Array<{
    id?: Id;
    name: string;
    unit: string;
    qty: number;
    price: number;
  }>;
};
