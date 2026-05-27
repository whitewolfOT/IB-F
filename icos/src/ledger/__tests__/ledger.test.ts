import { createLedgerEntry, postTransaction, assertBalance, BalanceViolationError, LedgerConstraintError } from '../index';
import { SubledgerType, ApprovalState } from '../../types';

const baseParams = {
  originating_event_id: 'evt-001',
  linked_contract_id: 'ctr-001',
  counterparties: ['party-a', 'party-b'],
  debit_account: SubledgerType.receivables,
  credit_account: SubledgerType.payables,
  amount: 1000,
  currency: 'USD',
  asset_reference: 'asset-001',
  created_by: 'user-001',
  approval_state: ApprovalState.draft,
};

describe('balance invariant', () => {
  it('passes when debits equal credits', () => {
    expect(() => assertBalance(1000, 1000)).not.toThrow();
  });

  it('throws BalanceViolationError when debits do not equal credits', () => {
    expect(() => assertBalance(1000, 900)).toThrow(BalanceViolationError);
  });

  it('BalanceViolationError carries debit and credit totals', () => {
    try {
      assertBalance(500, 400);
    } catch (e) {
      expect(e).toBeInstanceOf(BalanceViolationError);
      expect((e as BalanceViolationError).debitTotal).toBe(500);
      expect((e as BalanceViolationError).creditTotal).toBe(400);
    }
  });
});

describe('createLedgerEntry', () => {
  it('creates a valid entry with generated id, timestamp and audit_hash', () => {
    const entry = createLedgerEntry(baseParams);
    expect(entry.entry_id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.audit_hash).toBeTruthy();
    expect(entry.amount).toBe(1000);
  });

  it('throws when originating_event_id is missing', () => {
    expect(() => createLedgerEntry({ ...baseParams, originating_event_id: '' }))
      .toThrow(LedgerConstraintError);
  });

  it('throws when linked_contract_id is missing', () => {
    expect(() => createLedgerEntry({ ...baseParams, linked_contract_id: '' }))
      .toThrow(LedgerConstraintError);
  });

  it('throws when counterparties is empty', () => {
    expect(() => createLedgerEntry({ ...baseParams, counterparties: [] }))
      .toThrow(LedgerConstraintError);
  });
});

describe('postTransaction', () => {
  it('posts a balanced single entry', () => {
    const entry = createLedgerEntry(baseParams);
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to inventory subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.inventory, credit_account: SubledgerType.payables });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to partnership_capital subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.partnership_capital, credit_account: SubledgerType.receivables });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to profit_distribution subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.profit_distribution, credit_account: SubledgerType.payables });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to compliance_reserve subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.compliance_reserve, credit_account: SubledgerType.receivables });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to zakat subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.zakat });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to waqf subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.waqf });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts to agency_fee subledger', () => {
    const entry = createLedgerEntry({ ...baseParams, debit_account: SubledgerType.agency_fee });
    expect(() => postTransaction([entry])).not.toThrow();
  });

  it('posts a three-leg multi-entry transaction', () => {
    const e1 = createLedgerEntry({ ...baseParams, amount: 500, debit_account: SubledgerType.inventory, credit_account: SubledgerType.payables });
    const e2 = createLedgerEntry({ ...baseParams, amount: 300, debit_account: SubledgerType.receivables, credit_account: SubledgerType.payables });
    const e3 = createLedgerEntry({ ...baseParams, amount: 200, debit_account: SubledgerType.partnership_capital, credit_account: SubledgerType.payables });
    expect(() => postTransaction([e1, e2, e3])).not.toThrow();
  });
});
