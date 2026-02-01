export type RoleCode =
  | 'admin'
  | 'estimator'
  | 'supply_manager'
  | 'foreman'
  | 'head_realization'
  | 'head_supply'
  | 'head_sales';

export type Role = {
  id: number;
  code: RoleCode;
  name: string;
};

export type User = {
  id: number;
  email: string;
  fullName: string;
  bio?: string | null;
  isActive?: boolean;
  roles: Role[] | string[];
  updatedAt?: string | null;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};
