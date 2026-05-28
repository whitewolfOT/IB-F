import { Router, Request, Response } from 'express';
import { IIcosDb } from '../../db/interface';
import { generateAuditTrailPdf, generateRulingPdf, generateLedgerReconciliationPdf } from '../../pdf';
import { verifyLedgerEntryHash } from '../../ledger';
import { requireRole } from '../../auth/middleware';
import { OrgRole } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function exportsRouter(db: IIcosDb): Router {
  const router = Router();

  router.get('/events/:id/audit-trail',
    requireRole(OrgRole.compliance_officer, OrgRole.financial_controller, OrgRole.auditor),
    (req: Request, res: Response) => {
      try {
        const event = db.getEvent(String(req.params.id));
        if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

        const auditEvents = db.getAuditTrail(event.event_id);
        const ledgerEntries = db.getLedgerEntriesForContract(String(event.linked_contract_id));

        const pdf = generateAuditTrailPdf({
          event: event as unknown as Record<string, unknown>,
          auditEvents: auditEvents as unknown as Record<string, unknown>[],
          ledgerEntries: ledgerEntries as unknown as Record<string, unknown>[],
        });

        db.insertAccessLog({
          log_id: uuidv4(),
          user_id: req.user!.user_id,
          action: 'export_pdf',
          resource_type: 'event',
          resource_id: event.event_id,
          ip_address: req.ip ?? null,
          user_agent: String(req.headers['user-agent'] ?? ''),
          accessed_at: new Date().toISOString(),
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="audit-${event.event_id}.pdf"`);
        res.send(pdf);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

  router.get('/reviews/:id/ruling',
    requireRole(OrgRole.shariah_reviewer, OrgRole.senior_shariah_board, OrgRole.compliance_officer),
    (req: Request, res: Response) => {
      try {
        const review = db.getShariahReview(String(req.params.id));
        if (!review) { res.status(404).json({ error: 'Review not found' }); return; }

        const standards = db.listStandards(true);

        const pdf = generateRulingPdf({
          review,
          standards,
        });

        db.insertAccessLog({
          log_id: uuidv4(),
          user_id: req.user!.user_id,
          action: 'export_pdf',
          resource_type: 'shariah_review_record',
          resource_id: String(req.params.id),
          ip_address: req.ip ?? null,
          user_agent: String(req.headers['user-agent'] ?? ''),
          accessed_at: new Date().toISOString(),
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ruling-${req.params.id}.pdf"`);
        res.send(pdf);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

  router.get('/ledger/reconciliation',
    requireRole(OrgRole.financial_controller, OrgRole.auditor, OrgRole.compliance_officer),
    (req: Request, res: Response) => {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const since = typeof req.query.since === 'string' ? req.query.since : thirtyDaysAgo;
        const until = typeof req.query.until === 'string' ? req.query.until : now.toISOString();

        const summary = db.getLedgerSummary(since, until);
        const rawEntries = db.listAllLedgerEntries({ since, until });
        const entries = rawEntries.map(e => {
          let integrity_verified = false;
          try { integrity_verified = verifyLedgerEntryHash(e); } catch { integrity_verified = false; }
          return { ...(e as unknown as Record<string, unknown>), integrity_verified };
        });

        const pdf = generateLedgerReconciliationPdf({
          entries,
          summary,
          since,
          until,
          generatedBy: req.user!.user_id,
          generatedAt: now.toISOString(),
        });

        db.insertAccessLog({
          log_id: uuidv4(),
          user_id: req.user!.user_id,
          action: 'export_pdf',
          resource_type: 'ledger_reconciliation',
          resource_id: 'all',
          ip_address: req.ip ?? null,
          user_agent: String(req.headers['user-agent'] ?? ''),
          accessed_at: now.toISOString(),
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="ledger-reconciliation.pdf"');
        res.send(pdf);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

  return router;
}
