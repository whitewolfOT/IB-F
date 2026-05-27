import { classify, TransactionDescriptor } from '../index';

const base: TransactionDescriptor = {
  ownership_transfer: false,
  immediate_delivery: false,
  goods_standardized: false,
  manufactured_later: false,
  usufruct_transferred: false,
  single_capital_provider: false,
  labor_from_second_party: false,
  multiple_capital_providers: false,
  payment_timing: 'deferred',
  asset_fields_present: [],
};

describe('classify - murabaha branch', () => {
  it('classifies as murabaha when ownership transfer, immediate delivery, and purchase_cost present', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: true,
      asset_fields_present: ['purchase_cost', 'ownership_transfer', 'immediate_delivery', 'asset_description', 'sale_price', 'possession_status', 'requires_cost_disclosure'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('murabaha');
    expect(result.shariah_status).toBe('compliant');
    expect(result.violations).toHaveLength(0);
    expect(result.required_missing_fields).toHaveLength(0);
  });

  it('murabaha has high confidence when all fields present', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: true,
      asset_fields_present: ['purchase_cost', 'ownership_transfer', 'immediate_delivery', 'asset_description', 'sale_price', 'possession_status', 'requires_cost_disclosure'],
    };
    const result = classify(descriptor);
    expect(result.confidence_score).toBeGreaterThan(0.8);
  });
});

describe('classify - spot_sale branch', () => {
  it('classifies as spot_sale when ownership transfer and immediate delivery but no purchase_cost', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: true,
      asset_fields_present: ['ownership_transfer', 'immediate_delivery', 'asset_description', 'quantity', 'sale_price'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('spot_sale');
    expect(result.shariah_status).toBe('compliant');
  });

  it('spot_sale with no fields present has low confidence', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: true,
      asset_fields_present: [],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('spot_sale');
    expect(result.confidence_score).toBe(0);
  });
});

describe('classify - salam branch', () => {
  it('classifies as salam when ownership transfer, standardized goods, immediate payment', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: false,
      goods_standardized: true,
      payment_timing: 'immediate',
      asset_fields_present: ['ownership_transfer', 'payment_timing', 'goods_standardized', 'delivery_date', 'delivery_location', 'payment_amount'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('salam');
    expect(result.shariah_status).toBe('compliant');
  });

  it('salam fallback gets requires_review when ownership without clear delivery terms', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: false,
      goods_standardized: false,
      manufactured_later: false,
      payment_timing: 'installment', // not 'immediate' (salam) and not 'deferred' (deferred_payment_sale)
      asset_fields_present: [],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('salam');
    expect(result.shariah_status).toBe('requires_review');
    expect(result.risk_flags).toContain('ownership_transfer_without_clear_delivery_terms');
  });
});

describe('classify - istisna branch', () => {
  it('classifies as istisna when ownership transfer and manufactured_later', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: false,
      manufactured_later: true,
      asset_fields_present: ['ownership_transfer', 'manufactured_later', 'asset_specification', 'milestone_schedule', 'delivery_requirements'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('istisna');
    expect(result.shariah_status).toBe('compliant');
    expect(result.required_missing_fields).toHaveLength(0);
  });
});

describe('classify - ijarah branch', () => {
  it('classifies as ijarah when no ownership transfer and usufruct transferred', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      usufruct_transferred: true,
      asset_fields_present: ['usufruct_transferred', 'leased_asset', 'lease_duration', 'rent_schedule', 'maintenance_obligations'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('ijarah');
    expect(result.shariah_status).toBe('compliant');
  });

  it('ijarah with missing fields lists them as required_missing_fields', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      usufruct_transferred: true,
      asset_fields_present: [],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('ijarah');
    expect(result.required_missing_fields).toContain('leased_asset');
  });
});

describe('classify - mudaraba branch', () => {
  it('classifies as mudaraba when single capital provider and labor from second party', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      usufruct_transferred: false,
      single_capital_provider: true,
      labor_from_second_party: true,
      asset_fields_present: ['single_capital_provider', 'labor_from_second_party', 'profit_ratio_by_partner', 'capital_contribution'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('mudaraba');
    expect(result.shariah_status).toBe('compliant');
  });
});

describe('classify - musharaka branch', () => {
  it('classifies as musharaka when multiple capital providers', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      multiple_capital_providers: true,
      asset_fields_present: ['multiple_capital_providers', 'profit_ratio_by_partner', 'loss_ratio_by_partner', 'capital_contribution'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('musharaka');
    expect(result.shariah_status).toBe('compliant');
  });
});

describe('classify - qard branch', () => {
  it('classifies as qard when is_benevolent_loan is set', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      is_benevolent_loan: true,
      asset_fields_present: ['lender', 'borrower', 'principal_amount', 'repayment_schedule'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('qard');
    expect(result.shariah_status).toBe('compliant');
    expect(result.required_missing_fields).toHaveLength(0);
  });

  it('qard with no fields present lists required_missing_fields', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      is_benevolent_loan: true,
      asset_fields_present: [],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('qard');
    expect(result.required_missing_fields).toContain('lender');
    expect(result.required_missing_fields).toContain('principal_amount');
  });
});

describe('classify - wakala branch', () => {
  it('classifies as wakala when is_agency_agreement is set', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      is_agency_agreement: true,
      asset_fields_present: ['principal', 'agent', 'authorized_scope', 'fee_structure'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('wakala');
    expect(result.shariah_status).toBe('compliant');
    expect(result.required_missing_fields).toHaveLength(0);
  });

  it('qard takes precedence over wakala when both flags set', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      is_benevolent_loan: true,
      is_agency_agreement: true,
      asset_fields_present: ['lender', 'borrower', 'principal_amount', 'repayment_schedule'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('qard');
  });
});

describe('classify - deferred_payment_sale branch', () => {
  it('classifies as deferred_payment_sale when ownership transfer, non-immediate delivery, and payment is deferred', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: false,
      manufactured_later: false,
      goods_standardized: false,
      payment_timing: 'deferred',
      asset_fields_present: ['ownership_transfer', 'asset_description', 'quantity', 'sale_price', 'delivery_date'],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('deferred_payment_sale');
    expect(result.shariah_status).toBe('compliant');
    expect(result.violations).toHaveLength(0);
    expect(result.required_missing_fields).toHaveLength(0);
  });

  it('deferred_payment_sale does not trigger salam risk flag', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: true,
      immediate_delivery: false,
      manufactured_later: false,
      payment_timing: 'deferred',
      asset_fields_present: ['ownership_transfer', 'asset_description', 'quantity', 'sale_price', 'delivery_date'],
    };
    const result = classify(descriptor);
    expect(result.risk_flags).not.toContain('ownership_transfer_without_clear_delivery_terms');
  });
});

describe('classify - unknown/fallback branch', () => {
  it('returns unknown when no pattern matches', () => {
    const descriptor: TransactionDescriptor = {
      ...base,
      ownership_transfer: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      multiple_capital_providers: false,
      labor_from_second_party: false,
      asset_fields_present: [],
    };
    const result = classify(descriptor);
    expect(result.contract_type).toBe('unknown');
    expect(result.shariah_status).toBe('non_compliant');
    expect(result.violations).toContain('contract_type_cannot_be_determined');
    expect(result.risk_flags).toContain('unrecognized_contract_pattern');
  });
});
