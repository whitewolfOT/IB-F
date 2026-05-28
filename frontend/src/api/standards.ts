import client from './client';

export interface Standard {
  standard_id: string;
  code: string;
  title: string;
  description?: string;
  category?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface CreateStandardPayload {
  code: string;
  title: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

export const list = (params?: Record<string, unknown>) =>
  client.get<Standard[]>('/api/standards', { params }).then((r) => r.data);

export const create = (payload: CreateStandardPayload) =>
  client.post<Standard>('/api/standards', payload).then((r) => r.data);
