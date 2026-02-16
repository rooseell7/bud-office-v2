export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  note?: string | null;
  objectId?: number | null;
  createdAt: string;
  updatedAt: string;
};
