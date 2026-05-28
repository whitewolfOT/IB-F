import { Router, Request, Response } from 'express';
import { IIcosDb } from '../../db/interface';
import { requireRole } from '../../auth/middleware';
import { OrgRole } from '../../types';
import { verifyLedgerEntryHash, LedgerEntry } from '../../ledger';

const LEDGER_ROLES = [
  OrgRole.financial_controller,
  OrgRole.auditor,
  OrgRole.compliance_officer,
];

function withIntegrityFlag(entry: LedgerEntry): LedgerEntry & { integrity_verified: boolean } {
  let integrity_verified = false;
  try {
    integrity_verified = verifyLedgerEntryHash(entry);
  } catch {
    integrity_verified = false;
  }
  return { ...entry, integrity_verified };
}

export function ledgerRouter(db: IIcosDb): Router {
  const router = Router();

  router.get('/entries',
    requireRole(...LEDGER_ROLES),
    (req: Request, res: Response) => {
      try {
        const { subledger_type, since, until, contract_id, event_id } = req.query;
        const filters: {
          subledger_type?: string;
          since?: string;
          until?: string;
          contract_id?: string;
          event_id?: string;
        } = {};
        if (typeof subledger_type === 'string') filters.subledger_type = subledger_type;
        if (typeof since === 'string') filters.since = since;
        if (typeof until === 'string') filters.until = until;
        if (typeof contract_id === 'string') filters.contract_id = contract_id;
        if (typeof event_id === 'string') filters.event_id = event_id;

        const entries = db.listAllLedgerEntries(Object.keys(filters).length ? filters : undefined);
        res.json(entries.map(withIntegrityFlag));
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

  router.get('/summary',
    requireRole(...LEDGER_ROLES),
    (req: Request, res: Response) => {
      try {
        const { since, until } = req.query;
        const summary = db.getLedgerSummary(
          typeof since === 'string' ? since : undefined,
          typeof until === 'string' ? until : undefined,
        );
        if (!summary.balanced) {
          console.error(`[ICOS] Ledger imbalance detected: total_debits=${summary.total_debits}, total_credits=${summary.total_credits}, imbalance=${summary.imbalance}`);
        }
        res.json(summary);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

  return router;
}
