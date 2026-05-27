import { v4 as uuidv4 } from 'uuid';
import { ApprovalState, OrgRole } from '../types';
import { IcosEvent } from '../events';

export interface ApprovalAuditEvent {
  audit_event_id: string;
  timestamp: string;
  related_object_id: string;
  reviewer_entity: string;
  reviewer_role: OrgRole;
  prior_state: ApprovalState;
  new_state: ApprovalState;
  decision: string;
  decision_reason: string;
  supporting_documents: string[];
  digital_signature: string;
}

export class InvalidTransitionError extends Error {
  constructor(from: ApprovalState, to: ApprovalState) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Allowed transitions: [from, to]
const ALLOWED_TRANSITIONS: [ApprovalState, ApprovalState][] = [
  [ApprovalState.draft, ApprovalState.submitted],
  [ApprovalState.submitted, ApprovalState.under_review],
  [ApprovalState.under_review, ApprovalState.operationally_verified],
  [ApprovalState.under_review, ApprovalState.rejected],
  [ApprovalState.under_review, ApprovalState.returned_for_revision],
  [ApprovalState.operationally_verified, ApprovalState.financially_verified],
  [ApprovalState.operationally_verified, ApprovalState.rejected],
  [ApprovalState.financially_verified, ApprovalState.compliance_review],
  [ApprovalState.financially_verified, ApprovalState.shariah_review],
  [ApprovalState.compliance_review, ApprovalState.shariah_review],
  [ApprovalState.compliance_review, ApprovalState.approved],
  [ApprovalState.compliance_review, ApprovalState.rejected],
  [ApprovalState.shariah_review, ApprovalState.approved],
  [ApprovalState.shariah_review, ApprovalState.rejected],
  [ApprovalState.shariah_review, ApprovalState.returned_for_revision],
  [ApprovalState.approved, ApprovalState.settled],
  [ApprovalState.approved, ApprovalState.suspended],
  [ApprovalState.settled, ApprovalState.archived],
  [ApprovalState.rejected, ApprovalState.archived],
  [ApprovalState.returned_for_revision, ApprovalState.submitted],
  [ApprovalState.suspended, ApprovalState.under_review],
  [ApprovalState.suspended, ApprovalState.rejected],
];

// Authority matrix: which role is required for which transition condition
export const AUTHORITY_MATRIX: Record<string, OrgRole> = {
  small_inventory_transfer: OrgRole.warehouse_manager,
  large_capital_deployment: OrgRole.financial_controller,
  novel_contract_structure: OrgRole.senior_shariah_board,
  high_risk_counterparty: OrgRole.risk_officer,
  zakat_calculation_dispute: OrgRole.compliance_officer,
  parallel_salam_chain: OrgRole.shariah_reviewer,
};

export interface TransitionParams {
  event: IcosEvent;
  newState: ApprovalState;
  reviewer: string;
  role: OrgRole;
  reason: string;
  supportingDocuments?: string[];
}

export function transition(params: TransitionParams): ApprovalAuditEvent {
  const { event, newState, reviewer, role, reason } = params;
  const allowed = ALLOWED_TRANSITIONS.some(([from, to]) => from === event.approval_state && to === newState);
  if (!allowed) {
    throw new InvalidTransitionError(event.approval_state, newState);
  }
  const priorState = event.approval_state;
  (event as { approval_state: ApprovalState }).approval_state = newState;
  const auditEvent: ApprovalAuditEvent = {
    audit_event_id: uuidv4(),
    timestamp: new Date().toISOString(),
    related_object_id: event.event_id,
    reviewer_entity: reviewer,
    reviewer_role: role,
    prior_state: priorState,
    new_state: newState,
    decision: 'approved',
    decision_reason: reason,
    supporting_documents: params.supportingDocuments ?? [],
    digital_signature: `${uuidv4()}:${reviewer}:${priorState}->${newState}`,
  };
  return auditEvent;
}
