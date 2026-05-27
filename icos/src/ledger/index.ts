import { v4 as uuidv4 } from 'uuid';
import { SubledgerType, ApprovalState } from '../types';

export interface LedgerEntry {
  entry_id: string;
  timestamp: string;
  originating_event_id: string;
  linked_contract_id: string;
  counterparties: string[];
  debit_account: SubledgerType;
  credit_account: SubledgerType;
  amount: number;
  currency: string;
  asset_reference: string;
  created_by: string;
  approval_state: ApprovalState;
  audit_hash: string;
}

export class BalanceViolationError extends Error {
  constructor(public readonly debitTotal: number, public readonly creditTotal: number) {
    super(`Balance violation: debits ${debitTotal} ≠ credits ${creditTotal}`);
    this.name = 'BalanceViolationError';
  }
}

export class LedgerConstraintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerConstraintError';
  }
}

export function assertBalance(debitTotal: number, creditTotal: number): void {
  if (Math.abs(debitTotal - creditTotal) > 0.0001) {
    throw new BalanceViolationError(debitTotal, creditTotal);
  }
}

export type LedgerEntryParams = Omit<LedgerEntry, 'entry_id' | 'timestamp' | 'audit_hash'>;

export function createLedgerEntry(params: LedgerEntryParams): LedgerEntry {
  if (!params.originating_event_id) {
    throw new LedgerConstraintError('originating_event_id is required');
  }
  if (!params.linked_contract_id) {
    throw new LedgerConstraintError('linked_contract_id is required');
  }
  if (!params.counterparties || params.counterparties.length === 0) {
    throw new LedgerConstraintError('counterparties are required');
  }
  const entry_id = uuidv4();
  const timestamp = new Date().toISOString();
  const audit_hash = `${entry_id}:${params.originating_event_id}:${params.amount}:${timestamp}`;
  return { ...params, entry_id, timestamp, audit_hash };
}

export function postTransaction(entries: LedgerEntry[]): void {
  for (const e of entries) {
    if (!e.originating_event_id) throw new LedgerConstraintError('originating_event_id is required');
    if (!e.linked_contract_id) throw new LedgerConstraintError('linked_contract_id is required');
    if (!e.counterparties || e.counterparties.length === 0) throw new LedgerConstraintError('counterparties are required');
  }
  const debitTotal = entries.reduce((sum, e) => sum + e.amount, 0);
  const creditTotal = entries.reduce((sum, e) => sum + e.amount, 0);
  assertBalance(debitTotal, creditTotal);
}
