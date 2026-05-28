import client from './client';

export interface SystemConfig {
  [key: string]: unknown;
}

export interface ConfigProposal {
  proposal_id: string;
  key: string;
  proposed_value: unknown;
  proposed_by: string;
  status: string;
  ratified_by?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface AdminUser {
  user_id: string;
  email: string;
  role: string;
  is_master: boolean;
  is_active?: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: string;
  is_master?: boolean;
}

export interface Reviewer {
  reviewer_id: string;
  user_id: string;
  specialization?: string;
  authority_level?: number;
  is_active?: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface CreateReviewerPayload {
  user_id: string;
  specialization?: string;
  authority_level?: number;
}

export const getConfig = () =>
  client.get<SystemConfig>('/api/admin/config').then((r) => r.data);

export const getProposals = () =>
  client.get<ConfigProposal[]>('/api/admin/config/proposals').then((r) => r.data);

export const createProposal = (payload: Record<string, unknown>) =>
  client.post<ConfigProposal>('/api/admin/config/proposals', payload).then((r) => r.data);

export const ratify = (id: string) =>
  client.post<ConfigProposal>(`/api/admin/config/proposals/${id}/ratify`).then((r) => r.data);

export const reject = (id: string) =>
  client.post<ConfigProposal>(`/api/admin/config/proposals/${id}/reject`).then((r) => r.data);

export const listUsers = () =>
  client.get<AdminUser[]>('/api/admin/users').then((r) => r.data);

export const createUser = (payload: CreateUserPayload) =>
  client.post<AdminUser>('/api/admin/users', payload).then((r) => r.data);

export const updateUser = (id: string, payload: Partial<AdminUser>) =>
  client.patch<AdminUser>(`/api/admin/users/${id}`, payload).then((r) => r.data);

export const listReviewers = () =>
  client.get<Reviewer[]>('/api/admin/reviewers').then((r) => r.data);

export const createReviewer = (payload: CreateReviewerPayload) =>
  client.post<Reviewer>('/api/admin/reviewers', payload).then((r) => r.data);

export const updateReviewer = (id: string, payload: Partial<Reviewer>) =>
  client.patch<Reviewer>(`/api/admin/reviewers/${id}`, payload).then((r) => r.data);
