// src/modules/admin/types.ts

export interface Role {
  id: number;
  code: string;
  name: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}
