import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { IcosDb } from '../../db';
import { verifyPassword, signToken, TokenPayload } from '../../auth';
import { requireAuth } from '../../auth/middleware';
import { OrgRole } from '../../types';

export function authRouter(db: IcosDb): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
      }
      const user = db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      if (!user.active) {
        res.status(403).json({ error: 'Account is inactive' });
        return;
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      const payload: TokenPayload = {
        user_id: user.user_id,
        email: user.email,
        role: user.role as OrgRole,
        party_id: user.party_id,
        is_master: user.is_master,
      };
      const token = signToken(payload);
      // Store session
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8h default
      db.insertSession({
        session_id: uuidv4(),
        user_id: user.user_id,
        token_hash: tokenHash,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        revoked: false,
      });
      res.json({
        token,
        user: { user_id: user.user_id, email: user.email, role: user.role, is_master: user.is_master },
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/logout', requireAuth, (req: Request, res: Response) => {
    try {
      const header = req.headers.authorization!;
      const token = header.slice(7);
      const tokenHash = createHash('sha256').update(token).digest('hex');
      db.revokeSessionByTokenHash(tokenHash);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/me', requireAuth, (req: Request, res: Response) => {
    try {
      const user = db.getUserById(req.user!.user_id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      const { password_hash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
