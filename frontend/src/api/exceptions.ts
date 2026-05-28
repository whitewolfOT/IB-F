import client from './client';

export interface Exception {
  exception_id: string;
  event_id?: string;
  submitted_by?: string;
  reason: string;
  status: string;
  decision?: string;
  decided_by?: string;
  decided_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SubmitExceptionPayload {
  event_id?: string;
  reason: string;
  [key: string]: unknown;
}

export interface DecidePayload {
  decision: string;
  notes?: string;
}

export const submit = (payload: SubmitExceptionPayload) =>
  client.post<Exception>('/api/exceptions', payload).then((r) => r.data);

export const list = (params?: Record<string, unknown>) =>
  client.get<Exception[]>('/api/exceptions', { params }).then((r) => r.data);

export const get = (id: string) =>
  client.get<Exception>(`/api/exceptions/${id}`).then((r) => r.data);

export const decide = (id: string, payload: DecidePayload) =>
  client.post<Exception>(`/api/exceptions/${id}/decide`, payload).then((r) => r.data);

export const withdraw = (id: string) =>
  client.post<Exception>(`/api/exceptions/${id}/withdraw`).then((r) => r.data);
