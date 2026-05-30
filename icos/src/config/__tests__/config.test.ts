import { IcosDb } from '../../db';
import { ConfigService, CONFIG_DEFAULTS, seedConfigIfEmpty } from '../index';

function makeDb() {
  return new IcosDb(':memory:');
}

describe('seedConfigIfEmpty', () => {
  it('inserts all CONFIG_DEFAULTS keys on first call', () => {
    const db = makeDb();
    seedConfigIfEmpty(db);
    expect(db.listConfig().length).toBe(Object.keys(CONFIG_DEFAULTS).length);
    db.close();
  });

  it('is a no-op on second call (idempotent)', () => {
    const db = makeDb();
    seedConfigIfEmpty(db);
    seedConfigIfEmpty(db);
    expect(db.listConfig().length).toBe(Object.keys(CONFIG_DEFAULTS).length);
    db.close();
  });
});

describe('ConfigService', () => {
  function makeSvc() {
    const db = makeDb();
    seedConfigIfEmpty(db);
    const svc = new ConfigService(db);
    return { db, svc };
  }

  it('getOperationalWeights returns correct defaults', () => {
    const { svc, db } = makeSvc();
    expect(svc.getOperationalWeights()).toEqual({
      documentationComplete: 25,
      assetIdentified: 25,
      priceDisclosed: 20,
      deliverySpecified: 20,
      counterpartiesVerified: 10,
    });
    db.close();
  });

  it('getMurabahaThreshold returns 500000', () => {
    const { svc, db } = makeSvc();
    expect(svc.getMurabahaThreshold()).toBe(500000);
    db.close();
  });

  it('getAuthorityMatrix returns object with high_risk_counterparty: risk_officer', () => {
    const { svc, db } = makeSvc();
    const matrix = svc.getAuthorityMatrix();
    expect(matrix.high_risk_counterparty).toBe('risk_officer');
    db.close();
  });

  it('getProhibitedIndustries returns array containing alcohol', () => {
    const { svc, db } = makeSvc();
    const industries = svc.getProhibitedIndustries();
    expect(Array.isArray(industries)).toBe(true);
    expect(industries).toContain('alcohol');
    db.close();
  });

  it('propose creates a pending proposal', () => {
    const { svc, db } = makeSvc();
    // Need a user to satisfy FK
    const now = new Date().toISOString();
    db.insertUser({
      user_id: 'user-001', email: 'user@test.local',
      password_hash: 'hash', role: 'compliance_officer',
      party_id: null, is_master: false, active: true,
      created_at: now, updated_at: now,
    });
    const proposalId = svc.propose('compliance.operational.weight.documentationComplete', 30, 'user-001');
    const proposals = svc.getPendingProposals();
    expect(proposals.length).toBe(1);
    expect(proposals[0].proposal_id).toBe(proposalId);
    expect(proposals[0].status).toBe('pending');
    db.close();
  });

  it('ratify updates config, marks ratified, getOperationalWeights reflects new value', () => {
    const { svc, db } = makeSvc();
    const now = new Date().toISOString();
    db.insertUser({
      user_id: 'user-001', email: 'user@test.local',
      password_hash: 'hash', role: 'compliance_officer',
      party_id: null, is_master: false, active: true,
      created_at: now, updated_at: now,
    });
    const proposalId = svc.propose('compliance.operational.weight.documentationComplete', 30, 'user-001');
    svc.ratify(proposalId, 'user-001');
    expect(svc.getOperationalWeights().documentationComplete).toBe(30);
    const proposal = svc.getProposal(proposalId);
    expect(proposal?.status).toBe('ratified');
    db.close();
  });

  it('reject marks proposal rejected, does NOT update config', () => {
    const { svc, db } = makeSvc();
    const now = new Date().toISOString();
    db.insertUser({
      user_id: 'user-001', email: 'user@test.local',
      password_hash: 'hash', role: 'compliance_officer',
      party_id: null, is_master: false, active: true,
      created_at: now, updated_at: now,
    });
    const proposalId = svc.propose('compliance.operational.weight.documentationComplete', 99, 'user-001');
    svc.reject(proposalId, 'user-001', 'Too high');
    expect(svc.getOperationalWeights().documentationComplete).toBe(25); // unchanged
    const proposal = svc.getProposal(proposalId);
    expect(proposal?.status).toBe('rejected');
    db.close();
  });
});
