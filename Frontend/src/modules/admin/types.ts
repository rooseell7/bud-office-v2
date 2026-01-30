// src/modules/admin/types.ts

export type Role = {
  id: number;
  code: string;
  name: string;
};

export type User = {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: Role[];
};
