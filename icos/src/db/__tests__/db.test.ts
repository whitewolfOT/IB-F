import { IcosDb, DbParty, DbAsset, DbContract } from '../index';
import { createLedgerEntry } from '../../ledger';
import { SubledgerType, ApprovalState, OrgRole } from '../../types';
import { createEvent } from '../../events';
import { transition } from '../../approval';

function makeDb() {
  return new IcosDb(':memory:');
}

const party: DbParty = {
  party_id: 'party-001',
  name: 'Ahmed Al-Rashid',
  role: 'operator',
  country: 'UAE',
  verification_status: true,
};

const asset: DbAsset = {
  asset_id: 'asset-001',
  asset_type: 'agricultural_commodity',
  ownership_status: 'owned',
  valuation: 50000,
  description: 'Grade A wheat, 500 metric tons',
};

const contract: DbContract = {
  contract_id: 'ctr-001',
  contract_type: 'murabaha',
  status: 'draft',
  shariah_score: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('IcosDb — parties', () => {
  it('inserts and retrieves a party', () => {
    const db = makeDb();
    db.upsertParty(party);
    const result = db.getParty('party-001');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Ahmed Al-Rashid');
    expect(result?.verification_status).toBe(true);
    db.close();
  });

  it('upserts a party (update on conflict)', () => {
    const db = makeDb();
    db.upsertParty(party);
    db.upsertParty({ ...party, name: 'Ahmed Updated', verification_status: false });
    const result = db.getParty('party-001');
    expect(result?.name).toBe('Ahmed Updated');
    expect(result?.verification_status).toBe(false);
    db.close();
  });

  it('returns undefined for non-existent party', () => {
    const db = makeDb();
    expect(db.getParty('non-existent')).toBeUndefined();
    db.close();
  });
});

describe('IcosDb — assets', () => {
  it('inserts and retrieves an asset', () => {
    const db = makeDb();
    db.upsertAsset(asset);
    const result = db.getAsset('asset-001');
    expect(result).toBeDefined();
    expect(result?.valuation).toBe(50000);
    expect(result?.ownership_status).toBe('owned');
    db.close();
  });

  it('updates asset valuation on upsert', () => {
    const db = makeDb();
    db.upsertAsset(asset);
    db.upsertAsset({ ...asset, valuation: 55000, ownership_status: 'pledged' });
    const result = db.getAsset('asset-001');
    expect(result?.valuation).toBe(55000);
    expect(result?.ownership_status).toBe('pledged');
    db.close();
  });
});

describe('IcosDb — contracts', () => {
  it('inserts and retrieves a contract', () => {
    const db = makeDb();
    db.insertContract(contract);
    const result = db.getContract('ctr-001');
    expect(result).toBeDefined();
    expect(result?.contract_type).toBe('murabaha');
    expect(result?.status).toBe('draft');
    expect(result?.shariah_score).toBeNull();
    db.close();
  });

  it('updates contract status and shariah score', () => {
    const db = makeDb();
    db.insertContract(contract);
    db.updateContractStatus('ctr-001', 'approved', 95);
    const result = db.getContract('ctr-001');
    expect(result?.status).toBe('approved');
    expect(result?.shariah_score).toBe(95);
    db.close();
  });

  it('lists all contracts', () => {
    const db = makeDb();
    db.insertContract(contract);
    db.insertContract({ ...contract, contract_id: 'ctr-002', contract_type: 'salam' });
    expect(db.listContracts()).toHaveLength(2);
    db.close();
  });

  it('lists contracts filtered by status', () => {
    const db = makeDb();
    db.insertContract(contract);
    db.insertContract({ ...contract, contract_id: 'ctr-002', status: 'approved' });
    expect(db.listContracts('draft')).toHaveLength(1);
    expect(db.listContracts('approved')).toHaveLength(1);
    db.close();
  });
});

describe('IcosDb — events', () => {
  it('inserts and retrieves an event with counterparties', () => {
    const db = makeDb();
    db.upsertParty(party);
    db.insertContract(contract);
    const event = createEvent({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-001', 'party-002'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'asset-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'party-001',
    });
    db.insertEvent(event);
    const result = db.getEvent(event.event_id);
    expect(result).toBeDefined();
    expect(result?.counterparties).toContain('party-001');
    expect(result?.counterparties).toContain('party-002');
    expect(result?.approval_state).toBe('draft');
    db.close();
  });

  it('updates event approval state', () => {
    const db = makeDb();
    db.upsertParty(party);
    db.insertContract(contract);
    const event = createEvent({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-001'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'asset-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'party-001',
    });
    db.insertEvent(event);
    db.updateEventState(event.event_id, 'approved');
    const result = db.getEvent(event.event_id);
    expect(result?.approval_state).toBe('approved');
    db.close();
  });
});

describe('IcosDb — ledger entries', () => {
  it('inserts and retrieves ledger entries for a contract', () => {
    const db = makeDb();
    db.upsertParty(party);
    db.insertContract(contract);
    const event = createEvent({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-001'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'asset-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'party-001',
    });
    db.insertEvent(event);

    const entry = createLedgerEntry({
      originating_event_id: event.event_id,
      linked_contract_id: 'ctr-001',
      counterparties: ['party-001'],
      debit_account: SubledgerType.receivables,
      credit_account: SubledgerType.inventory,
      amount: 8000,
      currency: 'USD',
      asset_reference: 'asset-001',
      created_by: 'user-001',
      approval_state: ApprovalState.approved,
    });
    db.insertLedgerEntry(entry);

    const entries = db.getLedgerEntriesForContract('ctr-001');
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(8000);
    expect(entries[0].debit_account).toBe('receivables');
    expect(entries[0].credit_account).toBe('inventory');
    expect(entries[0].counterparties).toContain('party-001');
    db.close();
  });
});

describe('IcosDb — approval audit trail', () => {
  it('inserts and retrieves approval audit events', () => {
    const db = makeDb();
    db.upsertParty(party);
    db.insertContract(contract);
    const event = createEvent({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-001'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'asset-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'party-001',
    });
    db.insertEvent(event);

    const auditEvent = transition({
      event,
      newState: ApprovalState.submitted,
      reviewer: 'party-001',
      role: OrgRole.operator,
      reason: 'Initial submission',
    });
    db.insertApprovalAuditEvent(auditEvent);

    const trail = db.getAuditTrail(event.event_id);
    expect(trail).toHaveLength(1);
    expect(trail[0].prior_state).toBe('draft');
    expect(trail[0].new_state).toBe('submitted');
    db.close();
  });
});

describe('IcosDb — compliance flags', () => {
  it('inserts and retrieves compliance flags for a contract', () => {
    const db = makeDb();
    db.insertContract(contract);
    const flag = {
      flag_id: 'flag-001',
      contract_id: 'ctr-001',
      violation_type: 'shariah_non_compliance',
      severity: 'critical' as const,
      notes: 'Guaranteed return detected in partnership contract',
      created_at: new Date().toISOString(),
    };
    db.insertComplianceFlag(flag);
    const flags = db.getComplianceFlagsForContract('ctr-001');
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('critical');
    expect(flags[0].violation_type).toBe('shariah_non_compliance');
    db.close();
  });
});

describe('IcosDb — shariah review records', () => {
  it('inserts and retrieves shariah review records', () => {
    const db = makeDb();
    db.insertContract(contract);
    db.insertShariahReview({
      review_id: 'review-001',
      related_contract_id: 'ctr-001',
      reviewer_id: 'reviewer-001',
      triggering_reason: 'Novel contract structure detected',
      legal_reasoning: '',
      ruling_type: null,
      ruling_confidence: 0,
      freeze_settlement: false,
      block_profit_distribution: false,
      escalation_status: 'pending',
      digital_signature: '',
      timestamp: new Date().toISOString(),
    });
    const records = db.getShariahReviewsForContract('ctr-001');
    expect(records).toHaveLength(1);
    db.close();
  });
});
