import { Router, Request, Response } from 'express';
import { IcosDb, DbParty, DbAsset } from '../../db';

export function partiesRouter(db: IcosDb): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const { party_id, name, role, country, verification_status } = req.body as Partial<DbParty>;
      if (!party_id || !name || !role || !country) {
        res.status(400).json({ error: 'party_id, name, role, and country are required' });
        return;
      }
      const party: DbParty = {
        party_id, name, role, country,
        verification_status: verification_status ?? false,
      };
      db.upsertParty(party);
      res.status(201).json(party);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const party = db.getParty(String(req.params.id));
      if (!party) { res.status(404).json({ error: 'Party not found' }); return; }
      res.json(party);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

export function assetsRouter(db: IcosDb): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const { asset_id, asset_type, ownership_status, valuation, description } = req.body as Partial<DbAsset>;
      if (!asset_id || !asset_type || !ownership_status || valuation === undefined || !description) {
        res.status(400).json({ error: 'asset_id, asset_type, ownership_status, valuation, and description are required' });
        return;
      }
      const asset: DbAsset = { asset_id, asset_type, ownership_status, valuation, description };
      db.upsertAsset(asset);
      res.status(201).json(asset);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const asset = db.getAsset(String(req.params.id));
      if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }
      res.json(asset);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
