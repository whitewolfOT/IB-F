import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IIcosDb, DbException } from '../../db/interface';
import { OrgRole } from '../../types';
import {
  ExceptionType, ExceptionScope,
  canSubmitException, getRequiredApprovers, getCurrentStep,
} from '../../exceptions';

export function exceptionsRouter(db: IIcosDb): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const {
        exception_type, event_id, grounds, scope,
        disputed_criterion, disputed_match, supporting_docs,
      } = req.body as Record<string, unknown>;

      if (!exception_type || !event_id || !grounds || !scope) {
        res.status(400).json({ error: 'exception_type, event_id, grounds, and scope are required' });
        return;
      }

      const role = req.user!.role;
      if (!canSubmitException(role, exception_type as ExceptionType)) {
        res.status(403).json({ error: `Role '${role}' is not permitted to submit '${exception_type}'` });
        return;
      }

      const event = db.getEvent(String(event_id));
      if (!event) {
        res.status(404).json({ error: `Event not found: ${event_id}` });
        return;
      }

      const now = new Date().toISOString();
      const ex: DbException = {
        exception_id: uuidv4(),
        exception_type: exception_type as ExceptionType,
        event_id: String(event_id),
        submitter_id: req.user!.user_id,
        grounds: String(grounds),
        scope: scope as ExceptionScope,
        disputed_criterion: disputed_criterion ? String(disputed_criterion) : null,
        disputed_match: disputed_match ? String(disputed_match) : null,
        supporting_docs: Array.isArray(supporting_docs) ? supporting_docs as string[] : [],
        status: 'pending',
        created_at: now,
        updated_at: now,
      };

      db.insertException(ex);
      res.status(201).json({ exception_id: ex.exception_id, status: 'pending' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      const user = req.user!;
      let exceptions: DbException[];

      if (user.is_master || user.role === OrgRole.compliance_officer) {
        exceptions = db.listExceptions();
      } else if (user.role === OrgRole.shariah_reviewer || user.role === OrgRole.senior_shariah_board) {
        exceptions = db.listExceptions({ exception_type: 'shariah_override_request' });
      } else {
        exceptions = db.listExceptions({ submitter_id: user.user_id });
      }

      res.json(exceptions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const ex = db.getException(String(req.params.id));
      if (!ex) {
        res.status(404).json({ error: `Exception not found: ${req.params.id}` });
        return;
      }

      const user = req.user!;
      const canSee =
        user.is_master ||
        user.role === OrgRole.compliance_officer ||
        ex.submitter_id === user.user_id ||
        (ex.exception_type === 'shariah_override_request' &&
          (user.role === OrgRole.shariah_reviewer || user.role === OrgRole.senior_shariah_board));

      if (!canSee) {
        res.status(403).json({ error: 'Insufficient visibility for this exception type' });
        return;
      }

      const decisions = db.getDecisionsForException(ex.exception_id);
      res.json({ ...ex, decisions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:id/decide', (req: Request, res: Response) => {
    try {
      const { decision, notes } = req.body as Record<string, unknown>;
      if (!decision || !notes) {
        res.status(400).json({ error: 'decision and notes are required' });
        return;
      }
      if (decision !== 'approved' && decision !== 'rejected') {
        res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
        return;
      }

      const ex = db.getException(String(req.params.id));
      if (!ex) {
        res.status(404).json({ error: `Exception not found: ${req.params.id}` });
        return;
      }
      if (ex.status !== 'pending' && ex.status !== 'under_review') {
        res.status(409).json({ error: `Exception is already ${ex.status}` });
        return;
      }

      const approvers = getRequiredApprovers(ex.exception_type, ex.scope);
      const existingDecisions = db.getDecisionsForException(ex.exception_id);
      const currentStep = getCurrentStep(existingDecisions);

      if (currentStep > approvers.length) {
        res.status(409).json({ error: 'Exception is already fully decided' });
        return;
      }

      const expectedRole = approvers[currentStep - 1];
      if (req.user!.role !== expectedRole) {
        res.status(403).json({ error: `Step ${currentStep} requires role '${expectedRole}', got '${req.user!.role}'` });
        return;
      }

      const decisionRecord = {
        decision_id: uuidv4(),
        exception_id: ex.exception_id,
        decided_by: req.user!.user_id,
        decision: decision as 'approved' | 'rejected',
        notes: String(notes),
        decided_at: new Date().toISOString(),
        step: currentStep,
        total_steps_required: approvers.length,
      };

      db.insertExceptionDecision(decisionRecord);

      if (decision === 'rejected') {
        db.updateExceptionStatus(ex.exception_id, 'rejected');
        res.json({ ok: true, fully_approved: false });
      } else if (currentStep === approvers.length) {
        db.updateExceptionStatus(ex.exception_id, 'approved');
        res.json({ ok: true, fully_approved: true });
      } else {
        db.updateExceptionStatus(ex.exception_id, 'under_review');
        const nextRole = approvers[currentStep];
        res.json({ ok: true, fully_approved: false, next_approver_role: nextRole });
      }
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('not found') ? 404 : msg.includes('403') ? 403 : 400;
      res.status(status).json({ error: msg });
    }
  });

  router.post('/:id/withdraw', (req: Request, res: Response) => {
    try {
      const ex = db.getException(String(req.params.id));
      if (!ex) {
        res.status(404).json({ error: `Exception not found: ${req.params.id}` });
        return;
      }
      if (ex.submitter_id !== req.user!.user_id) {
        res.status(403).json({ error: 'Only the original submitter can withdraw an exception' });
        return;
      }
      if (ex.status !== 'pending' && ex.status !== 'under_review') {
        res.status(409).json({ error: `Cannot withdraw an exception with status '${ex.status}'` });
        return;
      }
      db.updateExceptionStatus(ex.exception_id, 'withdrawn');
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

export function eventExceptionsRouter(db: IIcosDb): Router {
  const router = Router({ mergeParams: true });

  router.get('/', (req: Request, res: Response) => {
    try {
      const exceptions = db.listExceptionsByEvent(String(req.params.id));
      res.json(exceptions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
