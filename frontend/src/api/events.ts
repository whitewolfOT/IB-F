import client from './client';
import type { ApprovalState } from '../types/index';

export interface FreezeState {
  settlement_frozen: boolean;
  profit_distribution_blocked: boolean;
  freeze_reason: string | null;
}

export interface EventRecord {
  event_id: string;
  state: ApprovalState;
  contract_type: string;
  description?: string;
  amount?: number;
  currency?: string;
  counterparty_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  audit_trail?: AuditEvent[];
  compliance_score?: number;
  contract_id?: string;
  review_id?: string;
  freezeState?: FreezeState;
  [key: string]: unknown;
}

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  from_state?: string;
  to_state?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface CreateEventPayload {
  contract_type: string;
  description?: string;
  amount?: number;
  currency?: string;
  counterparty_id?: string;
  [key: string]: unknown;
}

export interface TransitionPayload {
  newState: string;
  reason: string;
  conditions?: Record<string, unknown>;
}

export interface PipelinePayload {
  contract: Record<string, unknown>;
  descriptor: Record<string, unknown>;
}

export interface SettlePayload {
  contract: Record<string, unknown>;
  realized_profit: number;
}

export const list = (params?: Record<string, unknown>) =>
  client.get<EventRecord[]>('/api/events', { params }).then((r) => r.data);

export const get = (id: string) =>
  client.get<EventRecord>(`/api/events/${id}`).then((r) => r.data);

export const create = (payload: CreateEventPayload) =>
  client.post<EventRecord>('/api/events', payload).then((r) => r.data);

export const transition = (id: string, payload: TransitionPayload) =>
  client.post<EventRecord>(`/api/events/${id}/transition`, payload).then((r) => r.data);

export const runPipeline = (id: string, payload: PipelinePayload) =>
  client.post<EventRecord>(`/api/events/${id}/pipeline`, payload).then((r) => r.data);

export const settle = (id: string, payload: SettlePayload) =>
  client.post<EventRecord>(`/api/events/${id}/settle`, payload).then((r) => r.data);
