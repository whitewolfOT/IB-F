import axios from 'axios';
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
  axios.get<AuthUser>(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/auth/me`, {
    withCredentials: true,
  }).then((r) => r.data);
