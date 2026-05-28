import client from './client';

export interface LedgerEntry {
  entry_id: string;
  timestamp: string;
  originating_event_id: string;
  linked_contract_id: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  currency: string;
  asset_reference: string;
  created_by: string;
  approval_state: string;
  audit_hash: string;
  counterparties: string[];
  integrity_verified: boolean;
}

export interface LedgerSummary {
  total_debits: number;
  total_credits: number;
  entry_count: number;
  balanced: boolean;
  imbalance: number;
}

export interface LedgerFilters {
  subledger_type?: string;
  since?: string;
  until?: string;
  contract_id?: string;
  event_id?: string;
}

export async function listEntries(filters?: LedgerFilters): Promise<LedgerEntry[]> {
  const params = new URLSearchParams();
  if (filters?.subledger_type) params.set('subledger_type', filters.subledger_type);
  if (filters?.since) params.set('since', filters.since);
  if (filters?.until) params.set('until', filters.until);
  if (filters?.contract_id) params.set('contract_id', filters.contract_id);
  if (filters?.event_id) params.set('event_id', filters.event_id);
  const query = params.toString();
  const res = await client.get<LedgerEntry[]>(`/api/ledger/entries${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getSummary(since?: string, until?: string): Promise<LedgerSummary> {
  const params = new URLSearchParams();
  if (since) params.set('since', since);
  if (until) params.set('until', until);
  const query = params.toString();
  const res = await client.get<LedgerSummary>(`/api/ledger/summary${query ? `?${query}` : ''}`);
  return res.data;
}
