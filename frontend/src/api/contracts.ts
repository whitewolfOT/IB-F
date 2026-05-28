import client from './client';
import type { ContractType } from '../types/index';

export interface Contract {
  contract_id: string;
  contract_type: ContractType;
  parties: string[];
  amount?: number;
  currency?: string;
  terms?: Record<string, unknown>;
  state?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CreateContractPayload {
  contract_type: ContractType;
  parties: string[];
  amount?: number;
  currency?: string;
  terms?: Record<string, unknown>;
  [key: string]: unknown;
}

export const list = (params?: Record<string, unknown>) =>
  client.get<Contract[]>('/api/contracts', { params }).then((r) => r.data);

export const get = (id: string) =>
  client.get<Contract>(`/api/contracts/${id}`).then((r) => r.data);

export const create = (payload: CreateContractPayload) =>
  client.post<Contract>('/api/contracts', payload).then((r) => r.data);
