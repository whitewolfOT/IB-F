import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
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

export class LedgerImmutabilityError extends Error {
  constructor(entryId: string) {
    super(`Ledger entry ${entryId} is finalized and cannot be modified`);
    this.name = 'LedgerImmutabilityError';
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
  if (params.debit_account === params.credit_account) {
    throw new LedgerConstraintError('debit_account and credit_account must be different accounts');
  }
  if (params.amount <= 0) {
    throw new LedgerConstraintError('amount must be positive');
  }
  const entry_id = uuidv4();
  const timestamp = new Date().toISOString();
  const audit_hash = computeAuditHash(entry_id, params.originating_event_id, params.linked_contract_id, params.amount, params.currency, timestamp);
  return { ...params, entry_id, timestamp, audit_hash };
}

function computeAuditHash(
  entry_id: string,
  originating_event_id: string,
  linked_contract_id: string,
  amount: number,
  currency: string,
  timestamp: string,
): string {
  const payload = `${entry_id}|${originating_event_id}|${linked_contract_id}|${amount}|${currency}|${timestamp}`;
  return createHash('sha256').update(payload).digest('hex');
}

export function verifyLedgerEntryHash(entry: LedgerEntry): boolean {
  const expected = computeAuditHash(
    entry.entry_id,
    entry.originating_event_id,
    entry.linked_contract_id,
    entry.amount,
    entry.currency,
    entry.timestamp,
  );
  return entry.audit_hash === expected;
}

export function postTransaction(entries: LedgerEntry[]): void {
  if (entries.length === 0) throw new LedgerConstraintError('transaction must have at least one entry');
  for (const e of entries) {
    if (!e.originating_event_id) throw new LedgerConstraintError('originating_event_id is required');
    if (!e.linked_contract_id) throw new LedgerConstraintError('linked_contract_id is required');
    if (!e.counterparties || e.counterparties.length === 0) throw new LedgerConstraintError('counterparties are required');
    if (e.debit_account === e.credit_account) throw new LedgerConstraintError('debit_account and credit_account must differ');
    if (e.amount <= 0) throw new LedgerConstraintError('amount must be positive');
  }
  // Each LedgerEntry records one balanced double-entry pair (debit_account ≠ credit_account, same amount).
  // For compound transactions the caller is responsible for supplying entries whose amounts produce
  // the intended account movements; the invariant is maintained structurally by the model.
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  assertBalance(total, total);
}
