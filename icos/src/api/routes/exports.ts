import { Router, Request, Response } from 'express';
import { IcosDb } from '../../db';
import { generateAuditTrailPdf, generateRulingPdf } from '../../pdf';
import { requireRole } from '../../auth/middleware';
import { OrgRole } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function exportsRouter(db: IcosDb): Router {
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

  return router;
}
