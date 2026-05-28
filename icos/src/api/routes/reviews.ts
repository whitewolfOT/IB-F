import { Router, Request, Response } from 'express';
import { ShariahService } from '../../services/ShariahService';
import { RulingInput, RulingState, EffectiveScope, ShariahOverrideEvent } from '../../shariah';
import { requireRole } from '../../auth/middleware';
import { OrgRole } from '../../types';

export function reviewsRouter(shariah: ShariahService): Router {
  const router = Router();

  router.patch('/:id/ruling', (req: Request, res: Response) => {
    try {
      const {
        ruling_type, violated_principles, cited_standards, reasoning_summary,
        remediation_steps, effective_scope, expiration_conditions, override_permissions,
        legal_reasoning, ruling_confidence, digital_signature,
      } = req.body as Partial<RulingInput>;

      if (!ruling_type || !legal_reasoning || ruling_confidence === undefined) {
        res.status(400).json({ error: 'ruling_type, legal_reasoning, and ruling_confidence are required' });
        return;
      }

      const input: RulingInput = {
        ruling_type: ruling_type as RulingState,
        violated_principles: violated_principles ?? [],
        cited_standards: cited_standards ?? [],
        reasoning_summary: reasoning_summary ?? '',
        remediation_steps: remediation_steps ?? [],
        effective_scope: (effective_scope ?? 'contract-specific') as EffectiveScope,
        expiration_conditions: expiration_conditions ?? '',
        override_permissions: override_permissions ?? [],
        legal_reasoning,
        ruling_confidence,
        digital_signature,
      };

      const result = shariah.applyRuling(String(req.params.id), input);
      res.json(result);
    } catch (err) {
      const msg = (err as Error).message;
      res.status(msg.includes('not found') ? 404 : 400).json({ error: msg });
    }
  });

  router.patch('/:id/ruling/draft',
    requireRole(OrgRole.shariah_reviewer, OrgRole.senior_shariah_board),
    (req: Request, res: Response) => {
      try {
        const { draft_reasoning } = req.body as Record<string, unknown>;
        if (!draft_reasoning) {
          res.status(400).json({ error: 'draft_reasoning is required' });
          return;
        }
        const row = shariah.getReviewRecord(String(req.params.id));
        if (!row) {
          res.status(404).json({ error: `Review not found: ${req.params.id}` });
          return;
        }
        const updatedAt = shariah.saveDraft(String(req.params.id), String(draft_reasoning));
        res.json({ ok: true, draft_updated_at: updatedAt });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes('not found') ? 404 : 400).json({ error: msg });
      }
    });

  router.post('/:id/confirm',
    requireRole(OrgRole.senior_shariah_board),
    (req: Request, res: Response) => {
      try {
        const row = shariah.getReviewRecord(String(req.params.id));
        if (!row) {
          res.status(404).json({ error: `Review not found: ${req.params.id}` });
          return;
        }
        shariah.confirmReview(String(req.params.id));
        res.json({ ok: true });
      } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes('not found') ? 404 : 400).json({ error: msg });
      }
    });

  router.post('/:id/override', (req: Request, res: Response) => {
    try {
      const { authorizing_entities, justification, risk_acknowledgment, expiration_conditions } =
        req.body as Partial<Omit<ShariahOverrideEvent, 'override_id' | 'timestamp'>>;

      if (!authorizing_entities || !justification || !risk_acknowledgment || !expiration_conditions) {
        res.status(400).json({ error: 'authorizing_entities, justification, risk_acknowledgment, and expiration_conditions are required' });
        return;
      }

      const override = shariah.applyOverride(String(req.params.id), {
        overridden_ruling_id: String(req.params.id),
        authorizing_entities,
        justification,
        risk_acknowledgment,
        expiration_conditions,
      });
      res.status(201).json(override);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404
        : msg.includes('least 2') ? 403
        : 400;
      res.status(status).json({ error: msg });
    }
  });

  return router;
}
