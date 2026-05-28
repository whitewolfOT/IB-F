import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IIcosDb } from '../../db/interface';
import { ConfigService } from '../../config';
import { hashPassword } from '../../auth';
import { requireMaster } from '../../auth/middleware';
import { OrgRole } from '../../types';

// Who can propose each config key prefix
const PROPOSAL_ROLES: Record<string, OrgRole[]> = {
  'compliance.weight': [OrgRole.shariah_reviewer, OrgRole.senior_shariah_board],
  'compliance.scoreGate': [OrgRole.compliance_officer],
  'approval.authorityMatrix': [OrgRole.financial_controller],
  'approval.murabahaThreshold': [OrgRole.financial_controller],
  'prohibited.industries': [OrgRole.compliance_officer, OrgRole.shariah_reviewer],
  'contract.templates': [OrgRole.financial_controller, OrgRole.senior_shariah_board],
};

function getAllowedRolesForKey(configKey: string): OrgRole[] {
  for (const [prefix, roles] of Object.entries(PROPOSAL_ROLES)) {
    if (configKey.startsWith(prefix)) return roles;
  }
  return [];
}

export function adminRouter(db: IIcosDb, config: ConfigService): Router {
  const router = Router();

  // All admin routes require master (applied here + in app.ts)

  router.get('/config', requireMaster, (_req: Request, res: Response) => {
    try {
      const entries = db.listConfig();
      res.json(entries.map(e => ({
        key: e.config_key,
        value: JSON.parse(e.config_value),
        description: e.description,
        updated_at: e.updated_at,
      })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/config/proposals', requireMaster, (_req: Request, res: Response) => {
    try {
      res.json(db.getPendingProposals());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/config/proposals', (req: Request, res: Response) => {
    try {
      const { config_key, proposed_value, justification } = req.body as {
        config_key?: string;
        proposed_value?: unknown;
        justification?: string;
      };
      if (!config_key || proposed_value === undefined || !justification) {
        res.status(400).json({ error: 'config_key, proposed_value, and justification are required' });
        return;
      }
      const allowed = getAllowedRolesForKey(config_key);
      if (allowed.length > 0 && !allowed.includes(req.user!.role)) {
        res.status(403).json({ error: `Role '${req.user!.role}' cannot propose changes to '${config_key}'` });
        return;
      }
      if (!db.getConfig(config_key)) {
        res.status(400).json({ error: `Unknown config key: ${config_key}` });
        return;
      }
      const proposalId = config.propose(config_key, proposed_value, req.user!.user_id);
      res.status(201).json({ proposal_id: proposalId });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/config/proposals/:id/ratify', requireMaster, (req: Request, res: Response) => {
    try {
      const proposal = db.getProposal(String(req.params.id));
      if (!proposal) { res.status(404).json({ error: 'Proposal not found' }); return; }
      if (proposal.status !== 'pending') { res.status(409).json({ error: `Proposal is already ${proposal.status}` }); return; }
      config.ratify(String(req.params.id), req.user!.user_id);
      res.json({ ok: true, config_key: proposal.config_key, new_value: JSON.parse(proposal.proposed_value) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/config/proposals/:id/reject', requireMaster, (req: Request, res: Response) => {
    try {
      const { reason } = req.body as { reason?: string };
      if (!reason) { res.status(400).json({ error: 'reason is required' }); return; }
      const proposal = db.getProposal(String(req.params.id));
      if (!proposal) { res.status(404).json({ error: 'Proposal not found' }); return; }
      if (proposal.status !== 'pending') { res.status(409).json({ error: `Proposal is already ${proposal.status}` }); return; }
      config.reject(String(req.params.id), req.user!.user_id, reason);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/users', requireMaster, (_req: Request, res: Response) => {
    try {
      const users = db.listUsers().map(({ password_hash: _, ...u }) => u);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/users', requireMaster, async (req: Request, res: Response) => {
    try {
      const { email, password, role, party_id } = req.body as {
        email?: string; password?: string; role?: string; party_id?: string;
      };
      if (!email || !password || !role) {
        res.status(400).json({ error: 'email, password, and role are required' });
        return;
      }
      if (db.getUserByEmail(email)) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      const now = new Date().toISOString();
      const user_id = uuidv4();
      await db.insertUser({
        user_id,
        email,
        password_hash: await hashPassword(password),
        role,
        party_id: party_id ?? null,
        is_master: false,
        active: true,
        created_at: now,
        updated_at: now,
      });
      res.status(201).json({ user_id, email, role });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.patch('/users/:id', requireMaster, (req: Request, res: Response) => {
    try {
      const { role, active, party_id } = req.body as { role?: string; active?: boolean; party_id?: string };
      const user = db.getUserById(String(req.params.id));
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      db.updateUser(String(req.params.id), {
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
        ...(party_id !== undefined && { party_id }),
        updated_at: new Date().toISOString(),
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── Shariah Reviewer Profiles ─────────────────────────────────────────────

  router.get('/reviewers', requireMaster, (_req: Request, res: Response) => {
    try {
      res.json(db.listShariahReviewers(false));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/reviewers', requireMaster, (req: Request, res: Response) => {
    try {
      const {
        user_id, full_name, credentials, madhhab, jurisdiction,
        appointment_period_start, appointment_period_end,
      } = req.body as Record<string, unknown>;

      if (!user_id || !full_name || !credentials || !madhhab || !jurisdiction ||
          !appointment_period_start || !appointment_period_end) {
        res.status(400).json({ error: 'user_id, full_name, credentials, madhhab, jurisdiction, appointment_period_start, and appointment_period_end are required' });
        return;
      }

      const user = db.getUserById(String(user_id));
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      const reviewer = {
        reviewer_id: uuidv4(),
        user_id: String(user_id),
        full_name: String(full_name),
        credentials: String(credentials),
        madhhab: String(madhhab) as 'Hanafi' | 'Maliki' | 'Shafii' | 'Hanbali' | 'Jafari' | 'Other',
        jurisdiction: String(jurisdiction),
        appointment_period_start: String(appointment_period_start),
        appointment_period_end: String(appointment_period_end),
        active: true,
        created_at: new Date().toISOString(),
      };
      db.insertShariahReviewer(reviewer);
      res.status(201).json({ reviewer_id: reviewer.reviewer_id });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.patch('/reviewers/:id', requireMaster, (req: Request, res: Response) => {
    try {
      const { appointment_period_end, active, credentials } = req.body as {
        appointment_period_end?: string; active?: boolean; credentials?: string;
      };
      const reviewer = db.getShariahReviewerById(String(req.params.id));
      if (!reviewer) { res.status(404).json({ error: 'Reviewer not found' }); return; }
      db.updateShariahReviewer(String(req.params.id), {
        ...(appointment_period_end !== undefined && { appointment_period_end }),
        ...(active !== undefined && { active }),
        ...(credentials !== undefined && { credentials }),
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── Access Log ────────────────────────────────────────────────────────────

  router.get('/access-log', requireMaster, (req: Request, res: Response) => {
    try {
      const { resource_id, user_id, since, limit } = req.query as {
        resource_id?: string;
        user_id?: string;
        since?: string;
        limit?: string;
      };
      const maxLimit = Math.min(parseInt(limit ?? '100', 10) || 100, 1000);
      let rows;
      if (user_id) {
        rows = db.getAccessLogByUser(user_id, since).slice(0, maxLimit);
      } else if (resource_id) {
        rows = db.getAccessLog(resource_id).slice(0, maxLimit);
      } else {
        // Return recent entries across all resources
        rows = db.listAccessLog(since, maxLimit);
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
