import { Router, Request, Response } from 'express';
import { EventService } from '../../services/EventService';
import { PipelineService } from '../../services/PipelineService';
import { SettlementService } from '../../services/SettlementService';
import { ApprovalState, OrgRole } from '../../types';
import { AnyContract } from '../../pipeline';
import { TransactionDescriptor } from '../../classification';
import { PartnershipContract } from '../../contracts/schemas';
import { validateProhibitedIndustry } from '../../contracts/validators';

export function eventsRouter(
  events: EventService,
  pipeline: PipelineService,
  settlement: SettlementService,
): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const {
        location, event_type, counterparties, linked_contract_id,
        asset_reference, quantity, unit, supporting_documents, created_by,
      } = req.body as Record<string, unknown>;

      if (!linked_contract_id || !counterparties || !event_type) {
        res.status(400).json({ error: 'linked_contract_id, counterparties, and event_type are required' });
        return;
      }

      // Prohibited industry gate at intake (spec §14)
      if (asset_reference) {
        const industryCheck = validateProhibitedIndustry(String(asset_reference));
        if (!industryCheck.valid) {
          res.status(422).json({ error: `Prohibited industry in asset_reference: ${industryCheck.violations.join('; ')}` });
          return;
        }
      }

      const event = events.create({
        location: String(location ?? ''),
        event_type: event_type as Parameters<typeof events.create>[0]['event_type'],
        counterparties: counterparties as string[],
        linked_contract_id: String(linked_contract_id),
        asset_reference: String(asset_reference ?? ''),
        quantity: Number(quantity ?? 0),
        unit: String(unit ?? ''),
        supporting_documents: (supporting_documents as string[]) ?? [],
        created_by: req.user!.user_id,
      });
      res.status(201).json(event);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      const contractId = typeof req.query.contract_id === 'string' ? req.query.contract_id : undefined;
      // Client-role users only see their own events
      const createdBy = req.user?.role === 'client' ? req.user.user_id : undefined;
      res.json(events.list(contractId, createdBy));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      res.json(events.get(String(req.params.id)));
    } catch (err) {
      const msg = (err as Error).message;
      res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
    }
  });

  router.post('/:id/transition', (req: Request, res: Response) => {
    try {
      const { newState, reason, supportingDocuments, conditions } = req.body as Record<string, unknown>;
      const role = req.user!.role;
      const reviewer = req.user!.user_id;
      if (!newState || !reason) {
        res.status(400).json({ error: 'newState and reason are required' });
        return;
      }
      const audit = events.transition(String(req.params.id), {
        newState: newState as ApprovalState,
        reviewer,
        role: role as OrgRole,
        reason: reason as string,
        supportingDocuments: supportingDocuments as string[] | undefined,
        conditions: conditions as string[] | undefined,
      });
      res.json(audit);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404
        : msg.includes('Invalid transition') ? 422
        : msg.includes('requires role') || msg.includes('requires operational') ? 403
        : 500;
      res.status(status).json({ error: msg });
    }
  });

  router.post('/:id/pipeline', (req: Request, res: Response) => {
    try {
      const { contract, descriptor } = req.body as {
        contract?: AnyContract;
        descriptor?: TransactionDescriptor;
      };
      if (!contract || !descriptor) {
        res.status(400).json({ error: 'contract and descriptor are required' });
        return;
      }
      const result = pipeline.run(String(req.params.id), contract, descriptor);
      res.json(result);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404 : msg.includes('approved') ? 422 : 400;
      res.status(status).json({ error: msg });
    }
  });

  router.post('/:id/settle', (req: Request, res: Response) => {
    try {
      const { contract, realized_profit } = req.body as {
        contract?: PartnershipContract;
        realized_profit?: number;
      };
      if (!contract || realized_profit === undefined) {
        res.status(400).json({ error: 'contract and realized_profit are required' });
        return;
      }
      const record = settlement.settle(String(req.params.id), contract, realized_profit);
      res.json(record);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404 : msg.includes('frozen') ? 422 : 400;
      res.status(status).json({ error: msg });
    }
  });

  return router;
}
