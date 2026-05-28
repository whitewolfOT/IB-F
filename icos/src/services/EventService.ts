import { IIcosDb } from '../db/interface';
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
  freezeState: {
    settlement_frozen: boolean;
    profit_distribution_blocked: boolean;
    freeze_reason: string | null;
  };
}

export class EventService {
  constructor(private readonly db: IIcosDb) {}

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

    const reviews = this.db.getShariahReviewsForContract(event.linked_contract_id) as Record<string, unknown>[];
    const sorted = [...reviews].sort((a, b) =>
      String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''))
    );
    const freezingReview = sorted.find(r => r.freeze_settlement === 1 || r.freeze_settlement === true);
    const freezeState = {
      settlement_frozen: !!freezingReview,
      profit_distribution_blocked: !!(freezingReview?.block_profit_distribution),
      freeze_reason: freezingReview ? String(freezingReview.review_id) : null,
    };

    return { event, auditTrail, freezeState };
  }

  list(linkedContractId?: string): Record<string, unknown>[] {
    return this.db.listEvents(linkedContractId);
  }
}
