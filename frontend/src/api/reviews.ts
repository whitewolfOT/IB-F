import client from './client';

export interface Review {
  review_id: string;
  event_id: string;
  reviewer_id?: string;
  ruling_type?: string;
  legal_reasoning?: string;
  ruling_confidence?: number;
  draft_reasoning?: string;
  draft_updated_at?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface RulingPayload {
  ruling_type: string;
  legal_reasoning: string;
  ruling_confidence: number;
  signature?: string;
  [key: string]: unknown;
}

export interface DraftPayload {
  draft_reasoning: string;
}

export const applyRuling = (id: string, payload: RulingPayload) =>
  client.patch<Review>(`/api/reviews/${id}/ruling`, payload).then((r) => r.data);

export const saveDraft = (id: string, payload: DraftPayload) =>
  client
    .patch<{ ok: boolean; draft_updated_at: string }>(`/api/reviews/${id}/ruling/draft`, payload)
    .then((r) => r.data);

export const confirmReview = (id: string) =>
  client.post<Review>(`/api/reviews/${id}/confirm`).then((r) => r.data);

export const applyOverride = (id: string, payload: Record<string, unknown>) =>
  client.post<Review>(`/api/reviews/${id}/override`, payload).then((r) => r.data);
