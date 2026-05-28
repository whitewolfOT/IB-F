import express from 'express';
import path from 'path';
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
import { instrumentsRouter } from './routes/instruments';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { exceptionsRouter } from './routes/exceptions';
import { uploadsRouter } from './routes/uploads';
import { standardsRouter } from './routes/standards';
import { requireAuth } from '../auth/middleware';
import { ConfigService, seedConfigIfEmpty } from '../config';
import { seedStandardsIfEmpty } from '../db/seed_standards';

export function createApp(db: IcosDb) {
  const app = express();
  app.use(express.json());

  // Seed config defaults and standards on startup
  seedConfigIfEmpty(db);
  seedStandardsIfEmpty(db);
  const configSvc = new ConfigService(db);

  const contracts = new ContractService(db);
  const events = new EventService(db);
  const pipeline = new PipelineService(db, configSvc);
  const settlementSvc = new SettlementService(db);
  const shariahSvc = new ShariahService(db);

  // Public auth routes
  app.use('/api/auth', authRouter(db));

  // All other routes require auth
  app.use('/api/parties',     requireAuth, partiesRouter(db));
  app.use('/api/assets',      requireAuth, assetsRouter(db));
  app.use('/api/contracts',   requireAuth, contractsRouter(contracts));
  app.use('/api/events',      requireAuth, eventsRouter(events, pipeline, settlementSvc));
  app.use('/api/reviews',     requireAuth, reviewsRouter(shariahSvc));
  app.use('/api/instruments', requireAuth, instrumentsRouter(db));

  // Admin routes (also require auth + master check per route)
  app.use('/api/admin', requireAuth, adminRouter(db, configSvc));

  // Exception workflow
  app.use('/api/exceptions', requireAuth, exceptionsRouter(db));

  // File uploads — POST requires auth (enforced inside router); GET is public
  app.use('/api/uploads', uploadsRouter(db));
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  // AAOIFI standards
  app.use('/api/standards', requireAuth, standardsRouter(db));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', system: 'ICOS', version: '0.1.0' });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
