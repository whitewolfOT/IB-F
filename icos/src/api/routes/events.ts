import { Router, Request, Response } from 'express';
import { EventService } from '../../services/EventService';
import { PipelineService } from '../../services/PipelineService';
import { SettlementService } from '../../services/SettlementService';
import { ApprovalState, OrgRole } from '../../types';
import { AnyContract } from '../../pipeline';
import { TransactionDescriptor } from '../../classification';
import { PartnershipContract } from '../../contracts/schemas';

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

      const event = events.create({
        location: String(location ?? ''),
        event_type: event_type as Parameters<typeof events.create>[0]['event_type'],
        counterparties: counterparties as string[],
        linked_contract_id: String(linked_contract_id),
        asset_reference: String(asset_reference ?? ''),
        quantity: Number(quantity ?? 0),
        unit: String(unit ?? ''),
        supporting_documents: (supporting_documents as string[]) ?? [],
        created_by: String(created_by ?? ''),
      });
      res.status(201).json(event);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
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
      const { newState, reviewer, role, reason, supportingDocuments } = req.body as {
        newState?: string;
        reviewer?: string;
        role?: string;
        reason?: string;
        supportingDocuments?: string[];
      };
      if (!newState || !reviewer || !role || !reason) {
        res.status(400).json({ error: 'newState, reviewer, role, and reason are required' });
        return;
      }
      const audit = events.transition(String(req.params.id), {
        newState: newState as ApprovalState,
        reviewer,
        role: role as OrgRole,
        reason,
        supportingDocuments,
      });
      res.json(audit);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404 : msg.includes('Invalid transition') ? 422 : 500;
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
