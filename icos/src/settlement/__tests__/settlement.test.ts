import { settle, SettlementError } from '../index';
import { createEvent } from '../../events';
import { ApprovalState } from '../../types';
import { PartnershipContract } from '../../contracts/schemas';
import {
  createShariahReviewStub,
  handleNonCompliance,
  RulingState,
  Ruling,
  SettlementFrozenError,
} from '../../shariah';

function makeApprovedEvent(contractId: string) {
  const event = createEvent({
    location: 'Warehouse Dubai',
    event_type: 'partnership_funding',
    counterparties: ['partner-A', 'partner-B'],
    linked_contract_id: contractId,
    asset_reference: 'asset-partnership-001',
    quantity: 1,
    unit: 'lot',
    supporting_documents: [],
    created_by: 'settlement-officer-001',
  });
  (event as { approval_state: ApprovalState }).approval_state = ApprovalState.approved;
  return event;
}

const validMusharaka: PartnershipContract = {
  contract_id: 'ctr-settle-001',
  contract_type: 'musharaka',
  partners: ['partner-A', 'partner-B'],
  capital_contribution_by_partner: { 'partner-A': 60000, 'partner-B': 40000 },
  labor_contribution_by_partner: { 'partner-A': 'management', 'partner-B': 'operations' },
  profit_ratio_by_partner: { 'partner-A': 60, 'partner-B': 40 },
  loss_ratio_by_partner: { 'partner-A': 60, 'partner-B': 40 },
  management_authority: { 'partner-A': 'full', 'partner-B': 'limited' },
  liquidation_rules: 'Pro-rata capital distribution',
  negligence_rules: 'Negligent party bears full loss',
  withdrawal_rules: '30-day notice required',
};

describe('settle', () => {
  it('settles correctly with 2 partners and transitions event to settled state', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = settle(event, validMusharaka, 10000);
    expect(result.final_state).toBe(ApprovalState.settled);
    expect(event.approval_state).toBe(ApprovalState.settled);
  });

  it('generates distributions for each partner according to profit ratios', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = settle(event, validMusharaka, 10000);
    expect(result.distributions['partner-A']).toBeCloseTo(6000);
    expect(result.distributions['partner-B']).toBeCloseTo(4000);
  });

  it('generates ledger entries for each partner distribution', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = settle(event, validMusharaka, 10000);
    expect(result.ledger_entries).toHaveLength(2);
    expect(result.ledger_entries[0].debit_account).toBe('profit_distribution');
    expect(result.ledger_entries[0].credit_account).toBe('payables');
  });

  it('returns settlement_id and timestamp', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = settle(event, validMusharaka, 5000);
    expect(result.settlement_id).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  it('throws SettlementError when event is not in approved state', () => {
    const event = createEvent({
      location: 'Warehouse Dubai',
      event_type: 'partnership_funding',
      counterparties: ['partner-A', 'partner-B'],
      linked_contract_id: validMusharaka.contract_id,
      asset_reference: 'asset-001',
      quantity: 1,
      unit: 'lot',
      supporting_documents: [],
      created_by: 'user-001',
    });
    // event is in draft state
    expect(() => settle(event, validMusharaka, 10000)).toThrow(SettlementError);
  });

  it('throws SettlementFrozenError when freeze_settlement is true', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const shariahRecord = createShariahReviewStub(validMusharaka.contract_id, 'Non-compliance detected');
    const ruling: Ruling = {
      ruling_type: RulingState.non_compliant,
      violated_principles: ['no_riba'],
      cited_standards: ['AAOIFI FAS 1'],
      reasoning_summary: 'Contains riba element',
      remediation_steps: [],
      effective_scope: 'contract-specific',
      expiration_conditions: 'Upon amendment',
      override_permissions: [],
    };
    shariahRecord.ruling = ruling;
    handleNonCompliance(shariahRecord);
    // freeze_settlement is now true
    expect(() => settle(event, validMusharaka, 10000, shariahRecord)).toThrow(SettlementFrozenError);
  });

  it('throws SettlementFrozenError when ruling is non_compliant even without handleNonCompliance', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const shariahRecord = createShariahReviewStub(validMusharaka.contract_id, 'Non-compliance detected');
    const ruling: Ruling = {
      ruling_type: RulingState.non_compliant,
      violated_principles: [],
      cited_standards: [],
      reasoning_summary: 'Direct non-compliance',
      remediation_steps: [],
      effective_scope: 'contract-specific',
      expiration_conditions: 'N/A',
      override_permissions: [],
    };
    shariahRecord.ruling = ruling;
    // Note: freeze_settlement is still false here, but ruling_type is non_compliant
    expect(() => settle(event, validMusharaka, 10000, shariahRecord)).toThrow(SettlementFrozenError);
  });

  it('settles normally when shariah record is compliant', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const shariahRecord = createShariahReviewStub(validMusharaka.contract_id, 'Routine review');
    const ruling: Ruling = {
      ruling_type: RulingState.compliant,
      violated_principles: [],
      cited_standards: [],
      reasoning_summary: 'Fully compliant',
      remediation_steps: [],
      effective_scope: 'contract-specific',
      expiration_conditions: 'N/A',
      override_permissions: [],
    };
    shariahRecord.ruling = ruling;
    const result = settle(event, validMusharaka, 10000, shariahRecord);
    expect(result.final_state).toBe(ApprovalState.settled);
  });
});
