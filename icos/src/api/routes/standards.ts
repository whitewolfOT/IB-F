import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IIcosDb } from '../../db/interface';
import { requireMaster } from '../../auth/middleware';

export function standardsRouter(db: IIcosDb): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    try {
      res.json(db.listStandards(true));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/', requireMaster, (req: Request, res: Response) => {
    try {
      const { code, title, summary } = req.body as Record<string, unknown>;
      if (!code || !title || !summary) {
        res.status(400).json({ error: 'code, title, and summary are required' });
        return;
      }

      const existing = db.getStandardByCode(String(code));
      if (existing) {
        res.status(409).json({ error: `Standard with code '${code}' already exists` });
        return;
      }

      const standard = {
        standard_id: uuidv4(),
        code: String(code),
        title: String(title),
        summary: String(summary),
        active: true,
        created_at: new Date().toISOString(),
      };
      db.insertStandard(standard);
      res.status(201).json({ standard_id: standard.standard_id });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
