import { IcosDb } from '../db';
import { createEvent, CreateEventParams, IcosEvent } from '../events';
import { transition, TransitionParams, ApprovalAuditEvent } from '../approval';
import { ApprovalState, OrgRole } from '../types';

export interface TransitionRequest {
  newState: ApprovalState;
  reviewer: string;
  role: OrgRole;
  reason: string;
  supportingDocuments?: string[];
  conditions?: string[];
}

export interface EventWithHistory {
  event: Omit<IcosEvent, 'counterparties'> & { counterparties: string[] };
  auditTrail: ApprovalAuditEvent[];
}

export class EventService {
  constructor(private readonly db: IcosDb) {}

  create(params: CreateEventParams): IcosEvent {
    const event = createEvent(params);
    this.db.insertEvent(event);
    return event;
  }

  transition(eventId: string, req: TransitionRequest): ApprovalAuditEvent {
    const stored = this.db.getEvent(eventId);
    if (!stored) throw new Error(`Event not found: ${eventId}`);

    const auditTrail = this.db.getAuditTrail(eventId);
    const event = stored as IcosEvent;
    const auditEvent = transition({
      event,
      newState: req.newState,
      reviewer: req.reviewer,
      role: req.role,
      reason: req.reason,
      supportingDocuments: req.supportingDocuments,
      conditions: req.conditions,
      priorAuditEvents: auditTrail,
    });

    this.db.updateEventState(eventId, req.newState);
    this.db.insertApprovalAuditEvent(auditEvent);
    return auditEvent;
  }

  get(eventId: string): EventWithHistory {
    const event = this.db.getEvent(eventId);
    if (!event) throw new Error(`Event not found: ${eventId}`);
    const auditTrail = this.db.getAuditTrail(eventId);
    return { event, auditTrail };
  }
}
