import { v4 as uuidv4 } from 'uuid';

export enum MadhhabSpecialization {
  Hanafi = 'Hanafi',
  Maliki = 'Maliki',
  Shafii = 'Shafii',
  Hanbali = 'Hanbali',
  Jafari = 'Jafari',
  Other = 'Other',
}

export type ReviewerType = 'internal_shariah_reviewer' | 'external_shariah_advisor' | 'shariah_board_member' | 'senior_faqih' | 'institutional_shariah_committee';

export interface ShariahReviewer {
  reviewer_id: string;
  name: string;
  credentials: string;
  reviewer_type: ReviewerType;
  madhhab_specialization: MadhhabSpecialization;
  jurisdiction: string;
  authorization_scope: string;
  appointment_period: string;
  active_status: boolean;
}

export enum RulingState {
  compliant = 'compliant',
  conditionally_compliant = 'conditionally_compliant',
  non_compliant = 'non_compliant',
  requires_modification = 'requires_modification',
  requires_escalation = 'requires_escalation',
  pending_additional_information = 'pending_additional_information',
  suspended_pending_review = 'suspended_pending_review',
}

export type EffectiveScope = 'contract-specific' | 'contract-type-wide' | 'global';

export interface EvidenceReference {
  reference_type: string;
  source_title: string;
  section_reference: string;
  quotation_excerpt: string;
  applicability_scope: string;
}

export interface Ruling {
  ruling_type: RulingState;
  violated_principles: string[];
  cited_standards: string[];
  reasoning_summary: string;
  remediation_steps: string[];
  effective_scope: EffectiveScope;
  expiration_conditions: string;
  override_permissions: string[];
}

export interface ShariahReviewRecord {
  review_id: string;
  timestamp: string;
  related_contract_id: string;
  related_event_ids: string[];
  reviewer_id: string;
  triggering_reason: string;
  submitted_documents: string[];
  detected_issues: string[];
  evidentiary_basis: EvidenceReference[];
  legal_reasoning: string;
  ruling: Ruling | null;
  ruling_confidence: number;
  required_remediation: string[];
  followup_requirements: string[];
  escalation_status: string;
  digital_signature: string;
  freeze_settlement: boolean;
  block_profit_distribution: boolean;
}

export interface ShariahOverrideEvent {
  override_id: string;
  overridden_ruling_id: string;
  authorizing_entities: string[];
  justification: string;
  risk_acknowledgment: string;
  timestamp: string;
  expiration_conditions: string;
}

export interface ComplianceFlag {
  flag_id: string;
  contract_id: string;
  violation_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notes: string;
  created_at: string;
}

export class ShariahOverrideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShariahOverrideError';
  }
}

export class SettlementFrozenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettlementFrozenError';
  }
}

export function createShariahReviewStub(contractId: string, triggeringReason: string, reviewerId: string = 'unassigned'): ShariahReviewRecord {
  return {
    review_id: uuidv4(),
    timestamp: new Date().toISOString(),
    related_contract_id: contractId,
    related_event_ids: [],
    reviewer_id: reviewerId,
    triggering_reason: triggeringReason,
    submitted_documents: [],
    detected_issues: [],
    evidentiary_basis: [],
    legal_reasoning: '',
    ruling: null,
    ruling_confidence: 0,
    required_remediation: [],
    followup_requirements: [],
    escalation_status: 'pending',
    digital_signature: '',
    freeze_settlement: false,
    block_profit_distribution: false,
  };
}

export function handleNonCompliance(record: ShariahReviewRecord): ComplianceFlag {
  if (record.ruling?.ruling_type !== RulingState.non_compliant) {
    throw new Error('handleNonCompliance called on non-non_compliant ruling');
  }
  record.freeze_settlement = true;
  record.block_profit_distribution = true;
  return {
    flag_id: uuidv4(),
    contract_id: record.related_contract_id,
    violation_type: 'shariah_non_compliance',
    severity: 'critical',
    notes: record.ruling.reasoning_summary,
    created_at: new Date().toISOString(),
  };
}

export interface RulingInput {
  ruling_type: RulingState;
  violated_principles: string[];
  cited_standards: string[];
  reasoning_summary: string;
  remediation_steps: string[];
  effective_scope: EffectiveScope;
  expiration_conditions: string;
  override_permissions: string[];
  legal_reasoning: string;
  ruling_confidence: number;
  digital_signature?: string;
}

export function updateShariahRuling(record: ShariahReviewRecord, input: RulingInput): ComplianceFlag | null {
  record.ruling = {
    ruling_type: input.ruling_type,
    violated_principles: input.violated_principles,
    cited_standards: input.cited_standards,
    reasoning_summary: input.reasoning_summary,
    remediation_steps: input.remediation_steps,
    effective_scope: input.effective_scope,
    expiration_conditions: input.expiration_conditions,
    override_permissions: input.override_permissions,
  };
  record.legal_reasoning = input.legal_reasoning;
  record.ruling_confidence = input.ruling_confidence;
  if (input.digital_signature !== undefined) {
    record.digital_signature = input.digital_signature;
  }
  if (input.ruling_type === RulingState.non_compliant) {
    return handleNonCompliance(record);
  }
  return null;
}

export function createOverride(params: Omit<ShariahOverrideEvent, 'override_id' | 'timestamp'>): ShariahOverrideEvent {
  if (!params.authorizing_entities || params.authorizing_entities.length < 2) {
    throw new ShariahOverrideError('Override requires at least 2 authorizing entities');
  }
  return {
    ...params,
    override_id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
}
