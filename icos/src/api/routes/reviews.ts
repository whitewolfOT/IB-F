import { Router, Request, Response } from 'express';
import { ShariahService } from '../../services/ShariahService';
import { RulingInput, RulingState, EffectiveScope } from '../../shariah';

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

  return router;
}
