import {
  canSubmitException, getRequiredApprovers, getCurrentStep,
  ExceptionType, ExceptionScope,
} from '../index';
import { OrgRole } from '../../types';

describe('exceptions — unit', () => {
  describe('canSubmitException', () => {
    it('operator can submit compliance_exception', () => {
      expect(canSubmitException(OrgRole.operator, 'compliance_exception')).toBe(true);
    });

    it('financial_controller can submit compliance_exception', () => {
      expect(canSubmitException(OrgRole.financial_controller, 'compliance_exception')).toBe(true);
    });

    it('operator cannot submit shariah_override_request', () => {
      expect(canSubmitException(OrgRole.operator, 'shariah_override_request')).toBe(false);
    });

    it('shariah_reviewer can submit shariah_override_request', () => {
      expect(canSubmitException(OrgRole.shariah_reviewer, 'shariah_override_request')).toBe(true);
    });

    it('any role can submit prohibited_industry_dispute', () => {
      expect(canSubmitException(OrgRole.auditor, 'prohibited_industry_dispute')).toBe(true);
      expect(canSubmitException(OrgRole.operator, 'prohibited_industry_dispute')).toBe(true);
      expect(canSubmitException(OrgRole.counterparty, 'prohibited_industry_dispute')).toBe(true);
    });
  });

  describe('getRequiredApprovers', () => {
    it('compliance_exception + this_event → [compliance_officer, shariah_reviewer]', () => {
      const approvers = getRequiredApprovers('compliance_exception', 'this_event');
      expect(approvers).toEqual([OrgRole.compliance_officer, OrgRole.shariah_reviewer]);
    });

    it('compliance_exception + this_contract_type → adds senior_shariah_board', () => {
      const approvers = getRequiredApprovers('compliance_exception', 'this_contract_type');
      expect(approvers).toEqual([
        OrgRole.compliance_officer,
        OrgRole.shariah_reviewer,
        OrgRole.senior_shariah_board,
      ]);
    });

    it('compliance_exception + this_counterparty → adds senior_shariah_board', () => {
      const approvers = getRequiredApprovers('compliance_exception', 'this_counterparty');
      expect(approvers).toHaveLength(3);
      expect(approvers[2]).toBe(OrgRole.senior_shariah_board);
    });

    it('shariah_override_request → [shariah_reviewer, senior_shariah_board]', () => {
      const approvers = getRequiredApprovers('shariah_override_request', 'this_event');
      expect(approvers).toEqual([OrgRole.shariah_reviewer, OrgRole.senior_shariah_board]);
    });

    it('prohibited_industry_dispute → [compliance_officer]', () => {
      const approvers = getRequiredApprovers('prohibited_industry_dispute', 'this_event');
      expect(approvers).toEqual([OrgRole.compliance_officer]);
    });
  });

  describe('getCurrentStep', () => {
    it('returns 1 when no decisions exist', () => {
      expect(getCurrentStep([])).toBe(1);
    });

    it('returns next step after existing decisions', () => {
      expect(getCurrentStep([{ step: 1 }])).toBe(2);
      expect(getCurrentStep([{ step: 1 }, { step: 2 }])).toBe(3);
    });
  });
});

// API integration tests
import request from 'supertest';
import { createApp } from '../../api/app';
import { IcosDb } from '../../db';
import { signToken } from '../../auth';
import { ApprovalState } from '../../types';

function makeToken(role: OrgRole, userId = 'u-test', isMaster = false) {
  return signToken({ user_id: userId, email: `${role}@test.com`, role, party_id: null, is_master: isMaster });
}

function setupTestEnv() {
  const db = new IcosDb(':memory:');
  const app = createApp(db);

  const now = new Date().toISOString();

  // Create users for FK constraints
  db.insertUser({
    user_id: 'u-operator', email: 'op@test.com', password_hash: 'x',
    role: OrgRole.operator, party_id: null, is_master: false, active: true,
    created_at: now, updated_at: now,
  });
  db.insertUser({
    user_id: 'u-compliance', email: 'comp@test.com', password_hash: 'x',
    role: OrgRole.compliance_officer, party_id: null, is_master: false, active: true,
    created_at: now, updated_at: now,
  });
  db.insertUser({
    user_id: 'u-shariah', email: 'sh@test.com', password_hash: 'x',
    role: OrgRole.shariah_reviewer, party_id: null, is_master: false, active: true,
    created_at: now, updated_at: now,
  });
  db.insertUser({
    user_id: 'u-other', email: 'other@test.com', password_hash: 'x',
    role: OrgRole.auditor, party_id: null, is_master: false, active: true,
    created_at: now, updated_at: now,
  });

  // Create contract + event (needed for FK)
  db.insertContract({ contract_id: 'c-1', contract_type: 'murabaha', status: 'approved', shariah_score: null, created_at: now, updated_at: now });
  db.insertEvent({
    event_id: 'e-1',
    event_type: 'goods_delivery',
    linked_contract_id: 'c-1',
    location: 'Dubai',
    asset_reference: 'steel',
    quantity: 10,
    unit: 'tons',
    created_by: 'u-operator',
    approval_state: ApprovalState.approved,
    counterparties: [],
    supporting_documents: [],
    timestamp: now,
  });

  return { db, app };
}

describe('exceptions — API', () => {
  it('POST /api/exceptions creates exception, returns exception_id', async () => {
    const { app } = setupTestEnv();
    const token = makeToken(OrgRole.operator, 'u-operator');

    const res = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        exception_type: 'compliance_exception',
        event_id: 'e-1',
        grounds: 'Asset is clearly halal despite keyword match',
        scope: 'this_event',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('exception_id');
    expect(res.body.status).toBe('pending');
  });

  it('POST /api/exceptions returns 403 if role not in EXCEPTION_SUBMITTERS', async () => {
    const { app } = setupTestEnv();
    const token = makeToken(OrgRole.auditor, 'u-other');

    const res = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        exception_type: 'compliance_exception',
        event_id: 'e-1',
        grounds: 'test',
        scope: 'this_event',
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/exceptions/:id/decide returns 403 if caller is not expected step approver', async () => {
    const { app } = setupTestEnv();
    const operatorToken = makeToken(OrgRole.operator, 'u-operator');

    const createRes = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ exception_type: 'compliance_exception', event_id: 'e-1', grounds: 'test', scope: 'this_event' });

    const exceptionId = createRes.body.exception_id;

    // Step 1 requires compliance_officer — try with wrong role (shariah_reviewer)
    const shariahToken = makeToken(OrgRole.shariah_reviewer, 'u-shariah');
    const decideRes = await request(app)
      .post(`/api/exceptions/${exceptionId}/decide`)
      .set('Authorization', `Bearer ${shariahToken}`)
      .send({ decision: 'approved', notes: 'Looks fine' });

    expect(decideRes.status).toBe(403);
  });

  it('first decide on a two-step exception moves status to under_review', async () => {
    const { app } = setupTestEnv();
    const operatorToken = makeToken(OrgRole.operator, 'u-operator');

    const createRes = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ exception_type: 'compliance_exception', event_id: 'e-1', grounds: 'test', scope: 'this_event' });

    const exceptionId = createRes.body.exception_id;

    // Step 1 requires compliance_officer
    const compToken = makeToken(OrgRole.compliance_officer, 'u-compliance');
    const decideRes = await request(app)
      .post(`/api/exceptions/${exceptionId}/decide`)
      .set('Authorization', `Bearer ${compToken}`)
      .send({ decision: 'approved', notes: 'First approval' });

    expect(decideRes.status).toBe(200);
    expect(decideRes.body.fully_approved).toBe(false);
    expect(decideRes.body.next_approver_role).toBe(OrgRole.shariah_reviewer);
  });

  it('final decide on a two-step exception moves status to approved', async () => {
    const { app } = setupTestEnv();
    const operatorToken = makeToken(OrgRole.operator, 'u-operator');

    const createRes = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ exception_type: 'compliance_exception', event_id: 'e-1', grounds: 'test', scope: 'this_event' });

    const exceptionId = createRes.body.exception_id;

    const compToken = makeToken(OrgRole.compliance_officer, 'u-compliance');
    await request(app)
      .post(`/api/exceptions/${exceptionId}/decide`)
      .set('Authorization', `Bearer ${compToken}`)
      .send({ decision: 'approved', notes: 'Step 1' });

    const shariahToken = makeToken(OrgRole.shariah_reviewer, 'u-shariah');
    const finalRes = await request(app)
      .post(`/api/exceptions/${exceptionId}/decide`)
      .set('Authorization', `Bearer ${shariahToken}`)
      .send({ decision: 'approved', notes: 'Step 2' });

    expect(finalRes.status).toBe(200);
    expect(finalRes.body.fully_approved).toBe(true);
  });

  it('POST /api/exceptions/:id/withdraw succeeds for original submitter', async () => {
    const { app } = setupTestEnv();
    const token = makeToken(OrgRole.operator, 'u-operator');

    const createRes = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ exception_type: 'compliance_exception', event_id: 'e-1', grounds: 'test', scope: 'this_event' });

    const exceptionId = createRes.body.exception_id;
    const withdrawRes = await request(app)
      .post(`/api/exceptions/${exceptionId}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.ok).toBe(true);
  });

  it('POST /api/exceptions/:id/withdraw returns 403 for a different user', async () => {
    const { app } = setupTestEnv();
    const operatorToken = makeToken(OrgRole.operator, 'u-operator');

    const createRes = await request(app)
      .post('/api/exceptions')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ exception_type: 'compliance_exception', event_id: 'e-1', grounds: 'test', scope: 'this_event' });

    const exceptionId = createRes.body.exception_id;
    const otherToken = makeToken(OrgRole.compliance_officer, 'u-compliance');
    const withdrawRes = await request(app)
      .post(`/api/exceptions/${exceptionId}/withdraw`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send();

    expect(withdrawRes.status).toBe(403);
  });
});
