import {
  createShariahReviewStub,
  handleNonCompliance,
  createOverride,
  updateShariahRuling,
  ShariahOverrideError,
  RulingState,
  Ruling,
  RulingInput,
  ShariahReviewRecord,
} from '../index';

function makeNonCompliantRecord(): ShariahReviewRecord {
  const record = createShariahReviewStub('ctr-001', 'Riba detected in structure');
  const ruling: Ruling = {
    ruling_type: RulingState.non_compliant,
    violated_principles: ['no_riba'],
    cited_standards: ['AAOIFI FAS 1'],
    reasoning_summary: 'Contract contains prohibited interest-based element',
    remediation_steps: ['Remove fixed return clause'],
    effective_scope: 'contract-specific',
    expiration_conditions: 'Upon contract amendment',
    override_permissions: [],
  };
  record.ruling = ruling;
  return record;
}

describe('createShariahReviewStub', () => {
  it('returns a record with freeze_settlement=false', () => {
    const record = createShariahReviewStub('ctr-001', 'Routine review');
    expect(record.freeze_settlement).toBe(false);
    expect(record.block_profit_distribution).toBe(false);
  });

  it('returns a record with null ruling', () => {
    const record = createShariahReviewStub('ctr-001', 'Initial review');
    expect(record.ruling).toBeNull();
  });

  it('returns a record with the correct contract_id', () => {
    const record = createShariahReviewStub('ctr-999', 'Test trigger');
    expect(record.related_contract_id).toBe('ctr-999');
  });

  it('returns a record with review_id and timestamp', () => {
    const record = createShariahReviewStub('ctr-001', 'Trigger test');
    expect(record.review_id).toBeTruthy();
    expect(record.timestamp).toBeTruthy();
  });

  it('uses provided reviewerId', () => {
    const record = createShariahReviewStub('ctr-001', 'test', 'reviewer-007');
    expect(record.reviewer_id).toBe('reviewer-007');
  });

  it('defaults reviewer_id to unassigned when not provided', () => {
    const record = createShariahReviewStub('ctr-001', 'test');
    expect(record.reviewer_id).toBe('unassigned');
  });
});

describe('handleNonCompliance', () => {
  it('sets freeze_settlement=true on non-compliant ruling', () => {
    const record = makeNonCompliantRecord();
    handleNonCompliance(record);
    expect(record.freeze_settlement).toBe(true);
  });

  it('sets block_profit_distribution=true on non-compliant ruling', () => {
    const record = makeNonCompliantRecord();
    handleNonCompliance(record);
    expect(record.block_profit_distribution).toBe(true);
  });

  it('returns a compliance flag with critical severity', () => {
    const record = makeNonCompliantRecord();
    const flag = handleNonCompliance(record);
    expect(flag.severity).toBe('critical');
    expect(flag.violation_type).toBe('shariah_non_compliance');
    expect(flag.contract_id).toBe('ctr-001');
  });

  it('throws when called on non non_compliant ruling', () => {
    const record = createShariahReviewStub('ctr-001', 'Compliant review');
    const ruling: Ruling = {
      ruling_type: RulingState.compliant,
      violated_principles: [],
      cited_standards: [],
      reasoning_summary: 'All good',
      remediation_steps: [],
      effective_scope: 'contract-specific',
      expiration_conditions: 'N/A',
      override_permissions: [],
    };
    record.ruling = ruling;
    expect(() => handleNonCompliance(record)).toThrow(Error);
  });

  it('throws when ruling is null', () => {
    const record = createShariahReviewStub('ctr-001', 'Stub');
    expect(() => handleNonCompliance(record)).toThrow(Error);
  });
});

describe('updateShariahRuling', () => {
  const baseInput: RulingInput = {
    ruling_type: RulingState.compliant,
    violated_principles: [],
    cited_standards: ['AAOIFI FAS 1'],
    reasoning_summary: 'Fully compliant structure',
    remediation_steps: [],
    effective_scope: 'contract-specific',
    expiration_conditions: 'N/A',
    override_permissions: [],
    legal_reasoning: 'No prohibited elements detected.',
    ruling_confidence: 0.95,
    digital_signature: 'sig-abc',
  };

  it('sets ruling on the record', () => {
    const record = createShariahReviewStub('ctr-001', 'Routine review');
    updateShariahRuling(record, baseInput);
    expect(record.ruling).not.toBeNull();
    expect(record.ruling?.ruling_type).toBe(RulingState.compliant);
  });

  it('sets legal_reasoning and ruling_confidence', () => {
    const record = createShariahReviewStub('ctr-001', 'Routine review');
    updateShariahRuling(record, baseInput);
    expect(record.legal_reasoning).toBe('No prohibited elements detected.');
    expect(record.ruling_confidence).toBe(0.95);
  });

  it('sets digital_signature when provided', () => {
    const record = createShariahReviewStub('ctr-001', 'Routine review');
    updateShariahRuling(record, baseInput);
    expect(record.digital_signature).toBe('sig-abc');
  });

  it('returns null for compliant ruling', () => {
    const record = createShariahReviewStub('ctr-001', 'Routine review');
    const flag = updateShariahRuling(record, baseInput);
    expect(flag).toBeNull();
  });

  it('sets freeze_settlement and block_profit_distribution for non_compliant ruling', () => {
    const record = createShariahReviewStub('ctr-001', 'Non-compliance check');
    const input: RulingInput = {
      ...baseInput,
      ruling_type: RulingState.non_compliant,
      violated_principles: ['no_riba'],
      reasoning_summary: 'Fixed return detected',
      legal_reasoning: 'Prohibited interest element found.',
    };
    updateShariahRuling(record, input);
    expect(record.freeze_settlement).toBe(true);
    expect(record.block_profit_distribution).toBe(true);
  });

  it('returns a ComplianceFlag for non_compliant ruling', () => {
    const record = createShariahReviewStub('ctr-001', 'Non-compliance check');
    const input: RulingInput = {
      ...baseInput,
      ruling_type: RulingState.non_compliant,
      violated_principles: ['no_riba'],
      reasoning_summary: 'Fixed return detected',
      legal_reasoning: 'Prohibited interest element found.',
    };
    const flag = updateShariahRuling(record, input);
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('critical');
    expect(flag?.contract_id).toBe('ctr-001');
  });
});

describe('createOverride', () => {
  it('creates override with 2 authorizers successfully', () => {
    const override = createOverride({
      overridden_ruling_id: 'ruling-001',
      authorizing_entities: ['board-member-1', 'board-member-2'],
      justification: 'Emergency exception approved by board',
      risk_acknowledgment: 'Risk acknowledged by senior management',
      expiration_conditions: 'Valid for 30 days',
    });
    expect(override.override_id).toBeTruthy();
    expect(override.timestamp).toBeTruthy();
    expect(override.authorizing_entities).toHaveLength(2);
  });

  it('creates override with more than 2 authorizers', () => {
    const override = createOverride({
      overridden_ruling_id: 'ruling-002',
      authorizing_entities: ['entity-1', 'entity-2', 'entity-3'],
      justification: 'Board consensus override',
      risk_acknowledgment: 'Acknowledged',
      expiration_conditions: '90 days',
    });
    expect(override.authorizing_entities).toHaveLength(3);
  });

  it('throws ShariahOverrideError with 1 authorizer', () => {
    expect(() =>
      createOverride({
        overridden_ruling_id: 'ruling-003',
        authorizing_entities: ['only-one'],
        justification: 'Single override attempt',
        risk_acknowledgment: 'Risk acknowledged',
        expiration_conditions: 'N/A',
      })
    ).toThrow(ShariahOverrideError);
  });

  it('throws ShariahOverrideError with 0 authorizers', () => {
    expect(() =>
      createOverride({
        overridden_ruling_id: 'ruling-004',
        authorizing_entities: [],
        justification: 'No authorizers attempt',
        risk_acknowledgment: 'None',
        expiration_conditions: 'N/A',
      })
    ).toThrow(ShariahOverrideError);
  });

  it('throws ShariahOverrideError with empty authorizing_entities array', () => {
    expect(() =>
      createOverride({
        overridden_ruling_id: 'ruling-005',
        authorizing_entities: [],
        justification: 'test',
        risk_acknowledgment: 'test',
        expiration_conditions: 'test',
      })
    ).toThrow(ShariahOverrideError);
  });
});
