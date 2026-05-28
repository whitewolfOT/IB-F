import client from './client';

export interface Party {
  party_id: string;
  name: string;
  type?: string;
  email?: string;
  contact?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface CreatePartyPayload {
  name: string;
  type?: string;
  email?: string;
  contact?: string;
  [key: string]: unknown;
}

export const list = (params?: Record<string, unknown>) =>
  client.get<Party[]>('/api/parties', { params }).then((r) => r.data);

export const create = (payload: CreatePartyPayload) =>
  client.post<Party>('/api/parties', payload).then((r) => r.data);
