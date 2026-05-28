import client from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  is_master: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const login = (payload: LoginPayload) =>
  client.post<LoginResponse>('/api/auth/login', payload).then((r) => r.data);

export const logout = () =>
  client.post('/api/auth/logout').then((r) => r.data);

export const me = () =>
  client.get<AuthUser>('/api/auth/me').then((r) => r.data);
