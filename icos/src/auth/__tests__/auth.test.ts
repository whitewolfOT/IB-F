import { Request, Response, NextFunction } from 'express';
import { hashPassword, verifyPassword, signToken, verifyToken, TokenPayload } from '../index';
import { requireAuth, requireRole, requireMaster } from '../middleware';
import { OrgRole } from '../../types';

function makeToken(role: OrgRole = OrgRole.compliance_officer, userId = 'test-user-001', isMaster = false): string {
  return signToken({ user_id: userId, email: `${userId}@test.local`, role, party_id: null, is_master: isMaster });
}

function mockReqResNext(overrides?: Partial<Request>) {
  const req = { headers: {}, ...overrides } as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('hashPassword', () => {
  it('produces a bcrypt hash not equal to plaintext', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).not.toBe('mypassword');
    expect(hash.startsWith('$2')).toBe(true);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('correct-password', hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });
});

describe('signToken + verifyToken', () => {
  it('round-trips: decoded payload matches input', () => {
    const payload: TokenPayload = {
      user_id: 'user-123',
      email: 'user@test.com',
      role: OrgRole.operator,
      party_id: 'party-001',
      is_master: false,
    };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.user_id).toBe(payload.user_id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.party_id).toBe(payload.party_id);
    expect(decoded.is_master).toBe(payload.is_master);
  });

  it('throws on tampered token', () => {
    const token = makeToken();
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws on expired token', async () => {
    const payload: TokenPayload = {
      user_id: 'user-123',
      email: 'user@test.com',
      role: OrgRole.operator,
      party_id: null,
      is_master: false,
    };
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(payload, process.env.JWT_SECRET ?? 'icos-dev-secret-change-in-production', { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 10));
    expect(() => verifyToken(token)).toThrow();
  });
});

describe('requireAuth middleware', () => {
  it('returns 401 with no Authorization header', () => {
    const { req, res, next } = mockReqResNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with malformed token', () => {
    const { req, res, next } = mockReqResNext({ headers: { authorization: 'Bearer invalid-token' } });
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user with valid token', () => {
    const token = makeToken(OrgRole.operator);
    const { req, res, next } = mockReqResNext({ headers: { authorization: `Bearer ${token}` } });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as Request & { user?: unknown }).user).toBeDefined();
  });
});

describe('requireRole middleware', () => {
  it('returns 403 when user role not in allowed list', () => {
    const token = makeToken(OrgRole.operator);
    const { req, res, next } = mockReqResNext({ headers: { authorization: `Bearer ${token}` } });
    requireAuth(req, res, next);
    (next as jest.Mock).mockClear();

    const roleMiddleware = requireRole(OrgRole.compliance_officer, OrgRole.financial_controller);
    roleMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when role matches', () => {
    const token = makeToken(OrgRole.compliance_officer);
    const { req, res, next } = mockReqResNext({ headers: { authorization: `Bearer ${token}` } });
    requireAuth(req, res, next);
    (next as jest.Mock).mockClear();
    (res.status as jest.Mock).mockClear();

    const roleMiddleware = requireRole(OrgRole.compliance_officer);
    roleMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireMaster middleware', () => {
  it('returns 403 when is_master false', () => {
    const token = makeToken(OrgRole.compliance_officer, 'user-001', false);
    const { req, res, next } = mockReqResNext({ headers: { authorization: `Bearer ${token}` } });
    requireAuth(req, res, next);
    (next as jest.Mock).mockClear();

    requireMaster(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when is_master true', () => {
    const token = makeToken(OrgRole.compliance_officer, 'master-001', true);
    const { req, res, next } = mockReqResNext({ headers: { authorization: `Bearer ${token}` } });
    requireAuth(req, res, next);
    (next as jest.Mock).mockClear();
    (res.status as jest.Mock).mockClear();

    requireMaster(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
