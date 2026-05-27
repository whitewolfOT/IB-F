import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IcosDb } from '../../db';
import { SupportingInstrument } from '../../contracts/schemas';
import {
  validateWaad,
  validateKhiyar,
  validateZakatObligation,
  validateRiskReserve,
  validateNonComplianceEvent,
} from '../../contracts/validators';

const INSTRUMENT_TYPES = ['waad', 'khiyar', 'zakat_obligation', 'risk_reserve', 'non_compliance_event'] as const;

function validateByType(instrument: SupportingInstrument) {
  switch (instrument.instrument_type) {
    case 'waad': return validateWaad(instrument);
    case 'khiyar': return validateKhiyar(instrument);
    case 'zakat_obligation': return validateZakatObligation(instrument);
    case 'risk_reserve': return validateRiskReserve(instrument);
    case 'non_compliance_event': return validateNonComplianceEvent(instrument);
  }
}

export function instrumentsRouter(db: IcosDb): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<SupportingInstrument>;

      if (!body.instrument_type || !INSTRUMENT_TYPES.includes(body.instrument_type as typeof INSTRUMENT_TYPES[number])) {
        res.status(400).json({ error: `instrument_type must be one of: ${INSTRUMENT_TYPES.join(', ')}` });
        return;
      }
      if (!body.linked_contract_id) {
        res.status(400).json({ error: 'linked_contract_id is required' });
        return;
      }

      const contract = db.getContract(body.linked_contract_id);
      if (!contract) {
        res.status(404).json({ error: `Contract not found: ${body.linked_contract_id}` });
        return;
      }

      const instrument: SupportingInstrument = {
        ...body,
        instrument_id: body.instrument_id ?? uuidv4(),
      } as SupportingInstrument;

      const result = validateByType(instrument);
      if (!result.valid) {
        res.status(400).json({ error: `Validation failed: ${result.violations.join(', ')}` });
        return;
      }

      const now = new Date().toISOString();
      db.insertInstrument({
        instrument_id: instrument.instrument_id,
        instrument_type: instrument.instrument_type,
        linked_contract_id: instrument.linked_contract_id,
        data_json: JSON.stringify(instrument),
        created_at: now,
      });

      res.status(201).json(instrument);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      const contractId = typeof req.query.contract_id === 'string' ? req.query.contract_id : undefined;
      if (!contractId) {
        res.status(400).json({ error: 'contract_id query parameter is required' });
        return;
      }
      res.json(db.listInstrumentsForContract(contractId));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const instrument = db.getInstrument(String(req.params.id));
      if (!instrument) {
        res.status(404).json({ error: `Instrument not found: ${req.params.id}` });
        return;
      }
      res.json(instrument);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
