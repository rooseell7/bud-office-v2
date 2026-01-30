import http from '../../api/http';

export type LoginDto = {
  email: string;
  password: string;
};

export type UserRole = {
  id: number;
  code: string;
  name: string;
};

export type User = {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export async function loginRequest(dto: LoginDto): Promise<LoginResponse> {
  // ВАЖЛИВО: тут НЕ треба "/api" — бо він вже є в baseURL (http.ts)
  const res = await http.post<LoginResponse>('/auth/login', {
    email: dto.email,
    password: dto.password,
  });
  return res.data;
}
