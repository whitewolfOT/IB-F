import request from 'supertest';
import { createApp } from '../app';
import { IcosDb } from '../../db';
import { OrgRole, SubledgerType, ApprovalState } from '../../types';
import { signToken } from '../../auth';
import { createLedgerEntry } from '../../ledger';

function makeApp() {
  const db = new IcosDb(':memory:');
  const app = createApp(db);
  return { app, db };
}

function makeToken(role: OrgRole, userId = 'user-001'): string {
  return signToken({ user_id: userId, email: `${userId}@test.local`, role, party_id: null, is_master: false });
}

const fcToken = makeToken(OrgRole.financial_controller);
const auditorToken = makeToken(OrgRole.auditor);
const coToken = makeToken(OrgRole.compliance_officer);
const operatorToken = makeToken(OrgRole.operator);

function makeEntry(overrides: { linked_contract_id?: string; debit_account?: SubledgerType; originating_event_id?: string; timestamp?: string } = {}) {
  return createLedgerEntry({
    originating_event_id: overrides.originating_event_id ?? 'evt-001',
    linked_contract_id: overrides.linked_contract_id ?? 'ctr-001',
    debit_account: overrides.debit_account ?? SubledgerType.receivables,
    credit_account: SubledgerType.payables,
    amount: 100,
    currency: 'USD',
    asset_reference: 'asset-001',
    created_by: 'sys',
    approval_state: ApprovalState.approved,
    counterparties: ['party-a'],
    ...(overrides.timestamp ? { timestamp: overrides.timestamp } : {}),
  });
}

describe('GET /api/ledger/entries', () => {
  it('returns 401 without token', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/ledger/entries');
    expect(res.status).toBe(401);
  });

  it('returns 403 for operator role', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/ledger/entries')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with empty array when no entries exist', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/ledger/entries')
      .set('Authorization', `Bearer ${fcToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns entries from multiple contracts without filter', async () => {
    const { app, db } = makeApp();
    const e1 = makeEntry({ linked_contract_id: 'ctr-001', originating_event_id: 'evt-001' });
    const e2 = makeEntry({ linked_contract_id: 'ctr-002', originating_event_id: 'evt-002' });
    db.insertLedgerEntry(e1);
    db.insertLedgerEntry(e2);

    const res = await request(app)
      .get('/api/ledger/entries')
      .set('Authorization', `Bearer ${auditorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by ?contract_id', async () => {
    const { app, db } = makeApp();
    const e1 = makeEntry({ linked_contract_id: 'ctr-001', originating_event_id: 'evt-001' });
    const e2 = makeEntry({ linked_contract_id: 'ctr-002', originating_event_id: 'evt-002' });
    db.insertLedgerEntry(e1);
    db.insertLedgerEntry(e2);

    const res = await request(app)
      .get('/api/ledger/entries?contract_id=ctr-001')
      .set('Authorization', `Bearer ${fcToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].linked_contract_id).toBe('ctr-001');
  });

  it('filters by ?subledger_type', async () => {
    const { app, db } = makeApp();
    const e1 = makeEntry({ debit_account: SubledgerType.receivables, originating_event_id: 'evt-001' });
    const e2 = makeEntry({ debit_account: SubledgerType.partnership_capital, originating_event_id: 'evt-002' });
    db.insertLedgerEntry(e1);
    db.insertLedgerEntry(e2);

    const res = await request(app)
      .get('/api/ledger/entries?subledger_type=receivables')
      .set('Authorization', `Bearer ${coToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].debit_account).toBe(SubledgerType.receivables);
  });

  it('filters by ?since', async () => {
    const { app, db } = makeApp();
    const e1 = makeEntry({ originating_event_id: 'evt-001' });
    const old = { ...e1, timestamp: '2020-01-01T00:00:00.000Z', entry_id: 'old-entry-001' };
    const e2 = makeEntry({ originating_event_id: 'evt-002' });
    db.insertLedgerEntry(old);
    db.insertLedgerEntry(e2);

    const res = await request(app)
      .get('/api/ledger/entries?since=2024-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${fcToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entry_id).toBe(e2.entry_id);
  });

  it('each entry has integrity_verified boolean', async () => {
    const { app, db } = makeApp();
    const entry = makeEntry();
    db.insertLedgerEntry(entry);

    const res = await request(app)
      .get('/api/ledger/entries')
      .set('Authorization', `Bearer ${fcToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('integrity_verified');
    expect(typeof res.body[0].integrity_verified).toBe('boolean');
  });
});

describe('GET /api/ledger/summary', () => {
  it('returns 200 with balanced: true when no entries', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/ledger/summary')
      .set('Authorization', `Bearer ${fcToken}`);
    expect(res.status).toBe(200);
    expect(res.body.balanced).toBe(true);
    expect(res.body.entry_count).toBe(0);
  });

  it('returns 403 for operator role', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/ledger/summary')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(403);
  });
});
