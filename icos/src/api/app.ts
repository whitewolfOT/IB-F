import express from 'express';
import { IcosDb } from '../db';
import { ContractService } from '../services/ContractService';
import { EventService } from '../services/EventService';
import { PipelineService } from '../services/PipelineService';
import { SettlementService } from '../services/SettlementService';
import { ShariahService } from '../services/ShariahService';
import { contractsRouter } from './routes/contracts';
import { eventsRouter } from './routes/events';
import { partiesRouter, assetsRouter } from './routes/parties';
import { reviewsRouter } from './routes/reviews';

export function createApp(db: IcosDb) {
  const app = express();
  app.use(express.json());

  const contracts = new ContractService(db);
  const events = new EventService(db);
  const pipeline = new PipelineService(db);
  const settlementSvc = new SettlementService(db);
  const shariahSvc = new ShariahService(db);

  app.use('/api/parties', partiesRouter(db));
  app.use('/api/assets', assetsRouter(db));
  app.use('/api/contracts', contractsRouter(contracts));
  app.use('/api/events', eventsRouter(events, pipeline, settlementSvc));
  app.use('/api/reviews', reviewsRouter(shariahSvc));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', system: 'ICOS', version: '0.1.0' });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
