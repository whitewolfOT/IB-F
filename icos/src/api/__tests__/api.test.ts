import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../app';
import { IcosDb } from '../../db';
import { ApprovalState, OrgRole } from '../../types';
import { transition } from '../../approval';
import { createEvent } from '../../events';

// supertest drives the express app in-process, no port needed
function makeApp() {
  const db = new IcosDb(':memory:');
  const app = createApp(db);
  return { app, db };
}

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.system).toBe('ICOS');
  });
});

describe('POST /api/contracts', () => {
  it('registers a new contract', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/contracts').send({
      contract_id: 'ctr-test-001',
      contract_type: 'murabaha',
    });
    expect(res.status).toBe(201);
    expect(res.body.contract_id).toBe('ctr-test-001');
    expect(res.body.status).toBe('draft');
  });

  it('returns 400 when contract_type is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/contracts').send({ contract_id: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/contracts', () => {
  it('lists all contracts', async () => {
    const { app } = makeApp();
    await request(app).post('/api/contracts').send({ contract_id: 'c1', contract_type: 'murabaha' });
    await request(app).post('/api/contracts').send({ contract_id: 'c2', contract_type: 'salam' });
    const res = await request(app).get('/api/contracts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters contracts by status', async () => {
    const { app } = makeApp();
    await request(app).post('/api/contracts').send({ contract_id: 'c1', contract_type: 'murabaha' });
    const res = await request(app).get('/api/contracts?status=draft');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/contracts/:id', () => {
  it('returns contract with empty ledger and audit trail', async () => {
    const { app } = makeApp();
    await request(app).post('/api/contracts').send({ contract_id: 'ctr-001', contract_type: 'murabaha' });
    const res = await request(app).get('/api/contracts/ctr-001');
    expect(res.status).toBe(200);
    expect(res.body.contract.contract_id).toBe('ctr-001');
    expect(res.body.ledgerEntries).toHaveLength(0);
    expect(res.body.auditTrail).toHaveLength(0);
  });

  it('returns 404 for unknown contract', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/contracts/non-existent');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/events', () => {
  it('creates an event linked to an existing contract', async () => {
    const { app } = makeApp();
    await request(app).post('/api/contracts').send({ contract_id: 'ctr-001', contract_type: 'murabaha' });

    const res = await request(app).post('/api/events').send({
      location: 'Dubai Warehouse',
      event_type: 'goods_delivery',
      counterparties: ['party-a', 'party-b'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'wheat-batch-01',
      quantity: 1000,
      unit: 'kg',
      supporting_documents: [],
      created_by: 'operator-001',
    });
    expect(res.status).toBe(201);
    expect(res.body.event_id).toBeTruthy();
    expect(res.body.approval_state).toBe('draft');
  });

  it('returns 400 when required fields are missing', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/events').send({ location: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/events/:id/transition', () => {
  async function createEventInDb(app: Application) {
    await request(app).post('/api/contracts').send({ contract_id: 'ctr-001', contract_type: 'murabaha' });
    const evtRes = await request(app).post('/api/events').send({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-a'],
      linked_contract_id: 'ctr-001',
      asset_reference: 'ref-001',
      quantity: 100,
      unit: 'kg',
      supporting_documents: [],
      created_by: 'op-001',
    });
    return evtRes.body.event_id as string;
  }

  it('transitions event from draft to submitted and returns audit event', async () => {
    const { app } = makeApp();
    const eventId = await createEventInDb(app);
    const res = await request(app).post(`/api/events/${eventId}/transition`).send({
      newState: 'submitted',
      reviewer: 'operator-001',
      role: 'operator',
      reason: 'Initial submission of murabaha sale event',
    });
    expect(res.status).toBe(200);
    expect(res.body.prior_state).toBe('draft');
    expect(res.body.new_state).toBe('submitted');
    expect(res.body.audit_event_id).toBeTruthy();
  });

  it('returns 422 for invalid state transition', async () => {
    const { app } = makeApp();
    const eventId = await createEventInDb(app);
    const res = await request(app).post(`/api/events/${eventId}/transition`).send({
      newState: 'settled',
      reviewer: 'op',
      role: 'operator',
      reason: 'skip to settled',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Invalid transition/);
  });

  it('returns 404 for unknown event', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/events/no-such-id/transition').send({
      newState: 'submitted',
      reviewer: 'x',
      role: 'operator',
      reason: 'test',
    });
    expect(res.status).toBe(404);
  });

  it('audit trail is persisted and retrievable via GET', async () => {
    const { app } = makeApp();
    const eventId = await createEventInDb(app);
    await request(app).post(`/api/events/${eventId}/transition`).send({
      newState: 'submitted',
      reviewer: 'operator-001',
      role: 'operator',
      reason: 'submitted',
    });
    const getRes = await request(app).get(`/api/events/${eventId}`);
    expect(getRes.body.auditTrail).toHaveLength(1);
    expect(getRes.body.auditTrail[0].new_state).toBe('submitted');
  });
});

describe('POST /api/events/:id/pipeline', () => {
  it('runs murabaha pipeline and persists ledger entries', async () => {
    const { app } = makeApp();
    await request(app).post('/api/contracts').send({ contract_id: 'ctr-m-001', contract_type: 'murabaha' });

    const evtRes = await request(app).post('/api/events').send({
      location: 'Dubai',
      event_type: 'goods_delivery',
      counterparties: ['seller-001', 'buyer-001'],
      linked_contract_id: 'ctr-m-001',
      asset_reference: 'wheat-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'op-001',
    });
    const eventId = evtRes.body.event_id;

    // Advance through approval states to 'approved'
    const steps: [string, string][] = [
      ['submitted', 'operator'],
      ['under_review', 'operator'],
      ['operationally_verified', 'warehouse_manager'],
      ['financially_verified', 'financial_controller'],
      ['compliance_review', 'compliance_officer'],
      ['approved', 'compliance_officer'],
    ];
    for (const [state, role] of steps) {
      await request(app).post(`/api/events/${eventId}/transition`).send({
        newState: state,
        reviewer: 'reviewer-001',
        role,
        reason: `Advancing to ${state}`,
      });
    }

    const murabahaContract = {
      contract_id: 'ctr-m-001',
      contract_type: 'murabaha',
      seller: 'seller-001',
      buyer: 'buyer-001',
      asset_description: 'Grade A wheat',
      quantity: 100,
      unit: 'tons',
      quality_grade: 'A',
      purchase_cost: 8000,
      sale_price: 10000,
      currency: 'USD',
      delivery_date: '2026-06-01',
      delivery_location: 'Warehouse A',
      payment_schedule: [{ date: '2026-06-01', amount: 10000, currency: 'USD' }],
      title_transfer_rule: 'on_delivery',
      possession_status: 'in_possession',
      requires_cost_disclosure: true,
      requires_asset_ownership_before_sale: true,
      profit_must_be_fixed_and_known: true,
    };

    const descriptor = {
      ownership_transfer: true,
      immediate_delivery: true,
      goods_standardized: false,
      manufactured_later: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      labor_from_second_party: false,
      multiple_capital_providers: false,
      payment_timing: 'deferred',
      asset_fields_present: [
        'purchase_cost', 'ownership_transfer', 'immediate_delivery',
        'asset_description', 'sale_price', 'possession_status', 'requires_cost_disclosure',
      ],
    };

    const pipeRes = await request(app)
      .post(`/api/events/${eventId}/pipeline`)
      .send({ contract: murabahaContract, descriptor });

    expect(pipeRes.status).toBe(200);
    expect(pipeRes.body.classification.contract_type).toBe('murabaha');
    expect(pipeRes.body.ledgerEntries).toHaveLength(2);

    // Verify entries were persisted to DB
    const contractRes = await request(app).get('/api/contracts/ctr-m-001');
    expect(contractRes.body.ledgerEntries).toHaveLength(2);
    expect(contractRes.body.ledgerEntries[0].amount).toBe(8000);
    expect(contractRes.body.ledgerEntries[1].amount).toBe(2000);
  });
});

describe('PATCH /api/reviews/:id/ruling', () => {
  it('applies a compliant ruling to a persisted review stub', async () => {
    const { app, db } = makeApp();
    db.insertContract({
      contract_id: 'ctr-rev-001', contract_type: 'murabaha',
      status: 'draft', shariah_score: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    db.insertShariahReview({
      review_id: 'rev-001',
      related_contract_id: 'ctr-rev-001',
      reviewer_id: 'reviewer-001',
      triggering_reason: 'Risk flag detected',
      legal_reasoning: '',
      ruling_type: null,
      ruling_confidence: 0,
      freeze_settlement: false,
      block_profit_distribution: false,
      escalation_status: 'pending',
      digital_signature: '',
      timestamp: new Date().toISOString(),
    });

    const res = await request(app).patch('/api/reviews/rev-001/ruling').send({
      ruling_type: 'compliant',
      violated_principles: [],
      cited_standards: ['AAOIFI FAS 1'],
      reasoning_summary: 'Structure is compliant',
      remediation_steps: [],
      effective_scope: 'contract-specific',
      expiration_conditions: 'N/A',
      override_permissions: [],
      legal_reasoning: 'No prohibited elements detected.',
      ruling_confidence: 0.95,
      digital_signature: 'sig-xyz',
    });

    expect(res.status).toBe(200);
    expect(res.body.review_id).toBe('rev-001');
    expect(res.body.ruling_type).toBe('compliant');
    expect(res.body.freeze_settlement).toBe(false);
    expect(res.body.compliance_flag).toBeNull();
  });

  it('applies a non_compliant ruling and sets freeze flags', async () => {
    const { app, db } = makeApp();
    db.insertContract({
      contract_id: 'ctr-rev-002', contract_type: 'murabaha',
      status: 'draft', shariah_score: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    db.insertShariahReview({
      review_id: 'rev-002',
      related_contract_id: 'ctr-rev-002',
      reviewer_id: 'reviewer-001',
      triggering_reason: 'Riba risk',
      legal_reasoning: '',
      ruling_type: null,
      ruling_confidence: 0,
      freeze_settlement: false,
      block_profit_distribution: false,
      escalation_status: 'pending',
      digital_signature: '',
      timestamp: new Date().toISOString(),
    });

    const res = await request(app).patch('/api/reviews/rev-002/ruling').send({
      ruling_type: 'non_compliant',
      violated_principles: ['no_riba'],
      cited_standards: ['AAOIFI FAS 1'],
      reasoning_summary: 'Interest element present',
      remediation_steps: ['Remove fixed return clause'],
      effective_scope: 'contract-specific',
      expiration_conditions: 'Upon amendment',
      override_permissions: [],
      legal_reasoning: 'Fixed return is riba.',
      ruling_confidence: 0.99,
    });

    expect(res.status).toBe(200);
    expect(res.body.ruling_type).toBe('non_compliant');
    expect(res.body.freeze_settlement).toBe(true);
    expect(res.body.block_profit_distribution).toBe(true);
    expect(res.body.compliance_flag).not.toBeNull();
    expect(res.body.compliance_flag.severity).toBe('critical');
  });

  it('returns 404 for unknown review', async () => {
    const { app } = makeApp();
    const res = await request(app).patch('/api/reviews/no-such-review/ruling').send({
      ruling_type: 'compliant',
      legal_reasoning: 'test',
      ruling_confidence: 0.9,
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when required fields are missing', async () => {
    const { app } = makeApp();
    const res = await request(app).patch('/api/reviews/rev-001/ruling').send({
      ruling_type: 'compliant',
    });
    expect(res.status).toBe(400);
  });
});

describe('SettlementService — audit trail guard', () => {
  it('blocks settlement when event has no compliance_review in audit trail', () => {
    const db = new IcosDb(':memory:');
    db.insertContract({
      contract_id: 'ctr-s-001', contract_type: 'musharaka',
      status: 'draft', shariah_score: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const event = createEvent({
      location: 'Test', event_type: 'partnership_funding',
      counterparties: ['pA', 'pB'], linked_contract_id: 'ctr-s-001',
      asset_reference: 'ref', quantity: 1, unit: 'lot',
      supporting_documents: [], created_by: 'user',
    });
    db.insertEvent(event);
    db.updateEventState(event.event_id, ApprovalState.approved);

    const { SettlementService } = require('../../services/SettlementService');
    const svc = new SettlementService(db);
    const contract = {
      contract_id: 'ctr-s-001', contract_type: 'musharaka',
      partners: ['pA', 'pB'],
      capital_contribution_by_partner: { pA: 60000, pB: 40000 },
      labor_contribution_by_partner: { pA: 'mgmt', pB: 'ops' },
      profit_ratio_by_partner: { pA: 60, pB: 40 },
      loss_ratio_by_partner: { pA: 60, pB: 40 },
      management_authority: { pA: 'full', pB: 'limited' },
      liquidation_rules: 'pro-rata',
      negligence_rules: 'negligent bears loss',
      withdrawal_rules: '30 days',
    };
    expect(() => svc.settle(event.event_id, contract, 10000)).toThrow(/compliance_review/);
    db.close();
  });

  it('allows settlement when compliance_review is present in audit trail', () => {
    const db = new IcosDb(':memory:');
    db.insertContract({
      contract_id: 'ctr-s-002', contract_type: 'musharaka',
      status: 'draft', shariah_score: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const event = createEvent({
      location: 'Test', event_type: 'partnership_funding',
      counterparties: ['pA', 'pB'], linked_contract_id: 'ctr-s-002',
      asset_reference: 'ref', quantity: 1, unit: 'lot',
      supporting_documents: [], created_by: 'user',
    });
    db.insertEvent(event);
    db.updateEventState(event.event_id, ApprovalState.approved);

    // Insert a compliance_review audit event to satisfy the guard
    db.insertApprovalAuditEvent(transition({
      event: { ...event, approval_state: ApprovalState.financially_verified },
      newState: ApprovalState.compliance_review,
      reviewer: 'compliance-officer-001',
      role: OrgRole.compliance_officer,
      reason: 'Compliance review completed',
    }));

    const { SettlementService } = require('../../services/SettlementService');
    const svc = new SettlementService(db);
    const contract = {
      contract_id: 'ctr-s-002', contract_type: 'musharaka',
      partners: ['pA', 'pB'],
      capital_contribution_by_partner: { pA: 60000, pB: 40000 },
      labor_contribution_by_partner: { pA: 'mgmt', pB: 'ops' },
      profit_ratio_by_partner: { pA: 60, pB: 40 },
      loss_ratio_by_partner: { pA: 60, pB: 40 },
      management_authority: { pA: 'full', pB: 'limited' },
      liquidation_rules: 'pro-rata',
      negligence_rules: 'negligent bears loss',
      withdrawal_rules: '30 days',
    };
    expect(() => svc.settle(event.event_id, contract, 10000)).not.toThrow();
    db.close();
  });
});
