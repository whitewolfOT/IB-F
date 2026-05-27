import { transition, InvalidTransitionError, ApprovalAuditEvent } from '../index';
import { createEvent } from '../../events';
import { ApprovalState, OrgRole } from '../../types';

function makeApprovedEvent() {
  const event = createEvent({
    location: 'Warehouse Dubai',
    event_type: 'goods_delivery',
    counterparties: ['party-a', 'party-b'],
    linked_contract_id: 'ctr-001',
    asset_reference: 'asset-001',
    quantity: 100,
    unit: 'tons',
    supporting_documents: [],
    created_by: 'user-001',
  });
  // Manually set to approved for testing
  (event as { approval_state: ApprovalState }).approval_state = ApprovalState.approved;
  return event;
}

function makeDraftEvent() {
  return createEvent({
    location: 'Warehouse Dubai',
    event_type: 'goods_delivery',
    counterparties: ['party-a', 'party-b'],
    linked_contract_id: 'ctr-001',
    asset_reference: 'asset-001',
    quantity: 100,
    unit: 'tons',
    supporting_documents: [],
    created_by: 'user-001',
  });
}

describe('transition', () => {
  it('transitions from draft to submitted', () => {
    const event = makeDraftEvent();
    expect(event.approval_state).toBe(ApprovalState.draft);
    const auditEvent = transition({
      event,
      newState: ApprovalState.submitted,
      reviewer: 'operator-001',
      role: OrgRole.operator,
      reason: 'Initial submission',
    });
    expect(event.approval_state).toBe(ApprovalState.submitted);
    expect(auditEvent.prior_state).toBe(ApprovalState.draft);
    expect(auditEvent.new_state).toBe(ApprovalState.submitted);
  });

  it('transitions from approved to settled', () => {
    const event = makeApprovedEvent();
    const auditEvent = transition({
      event,
      newState: ApprovalState.settled,
      reviewer: 'settlement-officer-001',
      role: OrgRole.settlement_officer,
      reason: 'All conditions met',
    });
    expect(event.approval_state).toBe(ApprovalState.settled);
    expect(auditEvent.new_state).toBe(ApprovalState.settled);
  });

  it('transitions from submitted to under_review', () => {
    const event = makeDraftEvent();
    transition({ event, newState: ApprovalState.submitted, reviewer: 'op-001', role: OrgRole.operator, reason: 'submit' });
    const auditEvent = transition({
      event,
      newState: ApprovalState.under_review,
      reviewer: 'reviewer-001',
      role: OrgRole.financial_controller,
      reason: 'Start review',
    });
    expect(event.approval_state).toBe(ApprovalState.under_review);
    expect(auditEvent.prior_state).toBe(ApprovalState.submitted);
  });

  it('throws InvalidTransitionError for invalid transition (draft -> approved)', () => {
    const event = makeDraftEvent();
    expect(() =>
      transition({
        event,
        newState: ApprovalState.approved,
        reviewer: 'reviewer-001',
        role: OrgRole.shariah_reviewer,
        reason: 'Skip steps',
      })
    ).toThrow(InvalidTransitionError);
  });

  it('throws InvalidTransitionError for invalid transition (settled -> draft)', () => {
    const event = makeApprovedEvent();
    transition({ event, newState: ApprovalState.settled, reviewer: 'so-001', role: OrgRole.settlement_officer, reason: 'settle' });
    expect(() =>
      transition({
        event,
        newState: ApprovalState.draft,
        reviewer: 'op-001',
        role: OrgRole.operator,
        reason: 'revert',
      })
    ).toThrow(InvalidTransitionError);
  });

  it('generates audit event on every transition', () => {
    const event = makeDraftEvent();
    const audit1 = transition({ event, newState: ApprovalState.submitted, reviewer: 'op-001', role: OrgRole.operator, reason: 'submit' });
    expect(audit1.audit_event_id).toBeTruthy();
    expect(audit1.timestamp).toBeTruthy();
    expect(audit1.digital_signature).toBeTruthy();
    expect(audit1.reviewer_entity).toBe('op-001');
    expect(audit1.reviewer_role).toBe(OrgRole.operator);
  });

  it('audit event contains related_object_id matching the event_id', () => {
    const event = makeDraftEvent();
    const audit = transition({ event, newState: ApprovalState.submitted, reviewer: 'op-001', role: OrgRole.operator, reason: 'test' });
    expect(audit.related_object_id).toBe(event.event_id);
  });

  it('handles suspended -> under_review transition', () => {
    const event = makeApprovedEvent();
    transition({ event, newState: ApprovalState.suspended, reviewer: 'co-001', role: OrgRole.compliance_officer, reason: 'suspend' });
    const audit = transition({ event, newState: ApprovalState.under_review, reviewer: 'fc-001', role: OrgRole.financial_controller, reason: 'reinvestigate' });
    expect(event.approval_state).toBe(ApprovalState.under_review);
    expect(audit.prior_state).toBe(ApprovalState.suspended);
  });

  it('transitions shariah_review to rejected', () => {
    const event = makeDraftEvent();
    transition({ event, newState: ApprovalState.submitted, reviewer: 'op-001', role: OrgRole.operator, reason: 's' });
    transition({ event, newState: ApprovalState.under_review, reviewer: 'fc-001', role: OrgRole.financial_controller, reason: 'r' });
    transition({ event, newState: ApprovalState.operationally_verified, reviewer: 'wm-001', role: OrgRole.warehouse_manager, reason: 'v' });
    transition({ event, newState: ApprovalState.financially_verified, reviewer: 'fc-001', role: OrgRole.financial_controller, reason: 'fv' });
    transition({ event, newState: ApprovalState.shariah_review, reviewer: 'sr-001', role: OrgRole.shariah_reviewer, reason: 'review' });
    const audit = transition({ event, newState: ApprovalState.rejected, reviewer: 'ssb-001', role: OrgRole.senior_shariah_board, reason: 'non-compliant structure' });
    expect(event.approval_state).toBe(ApprovalState.rejected);
    expect(audit.new_state).toBe(ApprovalState.rejected);
  });
});
