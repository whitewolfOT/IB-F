import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../app';
import { IcosDb } from '../../db';
import { OrgRole } from '../../types';
import { signToken } from '../../auth';
import { CONFIG_DEFAULTS } from '../../config';

function makeApp() {
  const db = new IcosDb(':memory:');
  const app = createApp(db);
  return { app, db };
}

function makeToken(role: OrgRole, userId = 'test-user-001', isMaster = false): string {
  return signToken({ user_id: userId, email: `${userId}@test.local`, role, party_id: null, is_master: isMaster });
}

function masterToken(): string {
  return makeToken(OrgRole.compliance_officer, 'master-001', true);
}

async function createUser(db: IcosDb, role: OrgRole, userId = uuidv4()): Promise<string> {
  const now = new Date().toISOString();
  await db.insertUser({
    user_id: userId, email: `${userId}@test.local`,
    password_hash: 'hash', role, party_id: null,
    is_master: false, active: true,
    created_at: now, updated_at: now,
  });
  return userId;
}

describe('GET /api/admin/config', () => {
  it('returns 401 without token', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/admin/config');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-master token', async () => {
    const { app } = makeApp();
    const token = makeToken(OrgRole.compliance_officer, 'non-master', false);
    const res = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for master token with all config keys', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${masterToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(Object.keys(CONFIG_DEFAULTS).length);
  });
});

describe('POST /api/admin/config/proposals', () => {
  it('compliance officer can propose prohibited.industries change', async () => {
    const { app, db } = makeApp();
    const userId = await createUser(db, OrgRole.compliance_officer);
    const token = makeToken(OrgRole.compliance_officer, userId);
    const res = await request(app)
      .post('/api/admin/config/proposals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        config_key: 'prohibited.industries',
        proposed_value: ['alcohol', 'tobacco'],
        justification: 'Removing some industries',
      });
    expect(res.status).toBe(201);
    expect(res.body.proposal_id).toBeTruthy();
  });

  it('compliance officer gets 403 proposing approval.murabahaThreshold', async () => {
    const { app, db } = makeApp();
    const userId = await createUser(db, OrgRole.compliance_officer);
    const token = makeToken(OrgRole.compliance_officer, userId);
    const res = await request(app)
      .post('/api/admin/config/proposals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        config_key: 'approval.murabahaThreshold',
        proposed_value: 1000000,
        justification: 'Raise murabaha threshold',
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot propose/);
  });
});

// Insert master-001 user so FK on decided_by is satisfied
async function insertMasterUser(db: IcosDb): Promise<void> {
  const now = new Date().toISOString();
  await db.insertUser({
    user_id: 'master-001', email: 'master-001@test.local',
    password_hash: 'hash', role: 'system', party_id: null,
    is_master: true, active: true, created_at: now, updated_at: now,
  });
}

describe('POST /api/admin/config/proposals/:id/ratify', () => {
  it('returns 403 for non-master token', async () => {
    const { app, db } = makeApp();
    const userId = await createUser(db, OrgRole.compliance_officer);
    const token = makeToken(OrgRole.compliance_officer, userId, false);
    // First create a proposal via master
    const propRes = await request(app)
      .post('/api/admin/config/proposals')
      .set('Authorization', `Bearer ${makeToken(OrgRole.compliance_officer, userId)}`)
      .send({
        config_key: 'compliance.operational.weight.documentationComplete',
        proposed_value: 30,
        justification: 'Increase documentation weight',
      });
    const proposalId = propRes.body.proposal_id;
    const res = await request(app)
      .post(`/api/admin/config/proposals/${proposalId}/ratify`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('returns 200 for master, config updated', async () => {
    const { app, db } = makeApp();
    await insertMasterUser(db); // FK: decided_by = master-001 must exist
    const userId = await createUser(db, OrgRole.compliance_officer);
    // Create proposal as compliance officer
    const propRes = await request(app)
      .post('/api/admin/config/proposals')
      .set('Authorization', `Bearer ${makeToken(OrgRole.compliance_officer, userId)}`)
      .send({
        config_key: 'compliance.operational.weight.documentationComplete',
        proposed_value: 30,
        justification: 'Increase documentation weight to 30',
      });
    expect(propRes.status).toBe(201);
    const proposalId = propRes.body.proposal_id;

    // Ratify as master
    const res = await request(app)
      .post(`/api/admin/config/proposals/${proposalId}/ratify`)
      .set('Authorization', `Bearer ${masterToken()}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.new_value).toBe(30);

    // Verify config updated
    const cfgRes = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${masterToken()}`);
    const docWeight = cfgRes.body.find((e: { key: string }) => e.key === 'compliance.operational.weight.documentationComplete');
    expect(docWeight.value).toBe(30);
  });
});

describe('POST /api/admin/config/proposals/:id/reject', () => {
  it('master rejects with reason, config unchanged', async () => {
    const { app, db } = makeApp();
    await insertMasterUser(db); // FK: decided_by = master-001 must exist
    const userId = await createUser(db, OrgRole.compliance_officer);
    const propRes = await request(app)
      .post('/api/admin/config/proposals')
      .set('Authorization', `Bearer ${makeToken(OrgRole.compliance_officer, userId)}`)
      .send({
        config_key: 'compliance.operational.weight.documentationComplete',
        proposed_value: 99,
        justification: 'Way too high',
      });
    const proposalId = propRes.body.proposal_id;

    const res = await request(app)
      .post(`/api/admin/config/proposals/${proposalId}/reject`)
      .set('Authorization', `Bearer ${masterToken()}`)
      .send({ reason: 'Documentation weight 99 is unreasonably high' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Config should remain unchanged (still 25)
    const cfgRes = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${masterToken()}`);
    const docWeight = cfgRes.body.find((e: { key: string }) => e.key === 'compliance.operational.weight.documentationComplete');
    expect(docWeight.value).toBe(25);
  });
});

describe('POST /api/admin/users', () => {
  it('master creates user, returns user_id', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${masterToken()}`)
      .send({
        email: 'newuser@test.local',
        password: 'SecurePass123!',
        role: 'compliance_officer',
      });
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBeTruthy();
    expect(res.body.email).toBe('newuser@test.local');
    expect(res.body.role).toBe('compliance_officer');
  });

  it('non-master gets 403', async () => {
    const { app } = makeApp();
    const token = makeToken(OrgRole.compliance_officer, 'non-master', false);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'newuser@test.local',
        password: 'SecurePass123!',
        role: 'compliance_officer',
      });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/admin/users/:id', () => {
  it('master sets active:false for a user', async () => {
    const { app, db } = makeApp();
    const userId = await createUser(db, OrgRole.compliance_officer);

    const res = await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${masterToken()}`)
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify via list
    const listRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${masterToken()}`);
    const user = listRes.body.find((u: { user_id: string }) => u.user_id === userId);
    expect(user.active).toBe(false);
  });
});

describe('GET /api/admin/users', () => {
  it('returns users list without password_hash', async () => {
    const { app, db } = makeApp();
    await createUser(db, OrgRole.compliance_officer);
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${masterToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const user of res.body) {
      expect(user.password_hash).toBeUndefined();
    }
  });
});
