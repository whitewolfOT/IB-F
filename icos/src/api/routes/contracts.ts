import { Router, Request, Response } from 'express';
import { ContractService } from '../../services/ContractService';
import { verifyLedgerEntryHash } from '../../ledger';

export function contractsRouter(contracts: ContractService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const { contract_id, contract_type, shariah_score } = req.body as {
        contract_id?: string;
        contract_type?: string;
        shariah_score?: number;
      };
      if (!contract_id || !contract_type) {
        res.status(400).json({ error: 'contract_id and contract_type are required' });
        return;
      }
      const contract = contracts.register({ contract_id, contract_type, status: 'draft', shariah_score: shariah_score ?? null });
      res.status(201).json(contract);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json(contracts.list(status));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const detail = contracts.get(String(req.params.id));
      res.json(detail);
    } catch (err) {
      const msg = (err as Error).message;
      res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
    }
  });

  router.patch('/:id/status', (req: Request, res: Response) => {
    try {
      const { status, shariah_score } = req.body as { status?: string; shariah_score?: number };
      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }
      contracts.updateStatus(String(req.params.id), status, shariah_score);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id/ledger', (req: Request, res: Response) => {
    try {
      const entries = contracts.getLedgerEntries(String(req.params.id));
      const result = entries.map(entry => ({
        ...entry,
        integrity_verified: verifyLedgerEntryHash(entry),
      }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
