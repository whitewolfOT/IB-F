import {
  validateSaleContract,
  validateSalamContract,
  validateIstisnaContract,
  validatePartnershipContract,
  validateIjarahContract,
  validateAgencyContract,
  validateQardContract,
  validateProhibitedIndustry,
} from '../validators';
import {
  SaleContract,
  SalamContract,
  IstisnaContract,
  PartnershipContract,
  IjarahContract,
  AgencyContract,
  QardContract,
} from '../schemas';

// --- SaleContract ---
const validSpotSale: SaleContract = {
  contract_id: 'ctr-001',
  contract_type: 'spot_sale',
  seller: 'seller-001',
  buyer: 'buyer-001',
  asset_description: 'Grade A Wheat',
  quantity: 100,
  unit: 'tons',
  quality_grade: 'A',
  purchase_cost: 800,
  sale_price: 1000,
  currency: 'USD',
  delivery_date: '2026-06-01',
  delivery_location: 'Warehouse A',
  payment_schedule: [{ date: '2026-06-01', amount: 1000, currency: 'USD' }],
  title_transfer_rule: 'on_delivery',
  possession_status: 'in_possession',
};

const validMurabaha: SaleContract = {
  ...validSpotSale,
  contract_id: 'ctr-002',
  contract_type: 'murabaha',
  requires_cost_disclosure: true,
  requires_asset_ownership_before_sale: true,
  profit_must_be_fixed_and_known: true,
  possession_status: 'in_possession',
};

describe('validateSaleContract', () => {
  it('validates a valid spot_sale contract', () => {
    const result = validateSaleContract(validSpotSale);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('validates a valid murabaha contract', () => {
    const result = validateSaleContract(validMurabaha);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when seller is missing', () => {
    const result = validateSaleContract({ ...validSpotSale, seller: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('seller is required');
  });

  it('fails when buyer is missing', () => {
    const result = validateSaleContract({ ...validSpotSale, buyer: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('buyer is required');
  });

  it('fails when asset_description is missing', () => {
    const result = validateSaleContract({ ...validSpotSale, asset_description: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('asset_description is required');
  });

  it('fails when quantity is zero or negative', () => {
    const result = validateSaleContract({ ...validSpotSale, quantity: 0 });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('quantity must be positive');
  });

  it('fails when sale_price is zero', () => {
    const result = validateSaleContract({ ...validSpotSale, sale_price: 0 });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('sale_price must be positive');
  });

  it('fails when delivery_date is missing', () => {
    const result = validateSaleContract({ ...validSpotSale, delivery_date: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('delivery_date is required');
  });

  it('fails when delivery_location is missing', () => {
    const result = validateSaleContract({ ...validSpotSale, delivery_location: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('delivery_location is required');
  });

  it('murabaha fails when requires_cost_disclosure is false', () => {
    const result = validateSaleContract({ ...validMurabaha, requires_cost_disclosure: false });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('murabaha: requires_cost_disclosure must be true');
  });

  it('murabaha fails when requires_asset_ownership_before_sale is false', () => {
    const result = validateSaleContract({ ...validMurabaha, requires_asset_ownership_before_sale: false });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('murabaha: requires_asset_ownership_before_sale must be true');
  });

  it('murabaha fails when profit_must_be_fixed_and_known is false', () => {
    const result = validateSaleContract({ ...validMurabaha, profit_must_be_fixed_and_known: false });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('murabaha: profit_must_be_fixed_and_known must be true');
  });

  it('murabaha fails when seller is not in possession', () => {
    const result = validateSaleContract({ ...validMurabaha, possession_status: 'not_in_possession' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('murabaha: seller must be in possession of asset before sale');
  });
});

// --- SalamContract ---
const validSalam: SalamContract = {
  contract_id: 'ctr-003',
  contract_type: 'salam',
  buyer: 'buyer-001',
  seller: 'seller-001',
  commodity_type: 'wheat',
  quantity: 50,
  quality_specification: 'Grade A',
  payment_amount: 5000,
  payment_timestamp: '2026-01-01T00:00:00Z',
  payment_completed: true,
  delivery_date: '2026-09-01',
  delivery_location: 'Port of Dubai',
  commodity_specification_is_ambiguous: false,
};

describe('validateSalamContract', () => {
  it('validates a valid salam contract', () => {
    const result = validateSalamContract(validSalam);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when buyer is missing', () => {
    const result = validateSalamContract({ ...validSalam, buyer: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('buyer is required');
  });

  it('fails when seller is missing', () => {
    const result = validateSalamContract({ ...validSalam, seller: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('seller is required');
  });

  it('fails when commodity_type is missing', () => {
    const result = validateSalamContract({ ...validSalam, commodity_type: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('commodity_type is required');
  });

  it('fails when quantity is not positive', () => {
    const result = validateSalamContract({ ...validSalam, quantity: 0 });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('quantity must be positive');
  });

  it('fails when delivery_date is missing', () => {
    const result = validateSalamContract({ ...validSalam, delivery_date: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('delivery_date is required');
  });

  it('fails when payment_completed is false', () => {
    const result = validateSalamContract({ ...validSalam, payment_completed: false });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('salam: full payment must be completed upfront');
  });

  it('fails when commodity_specification_is_ambiguous is true', () => {
    const result = validateSalamContract({ ...validSalam, commodity_specification_is_ambiguous: true });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('salam: commodity specification must not be ambiguous');
  });
});

// --- IstisnaContract ---
const validIstisna: IstisnaContract = {
  contract_id: 'ctr-004',
  contract_type: 'istisna',
  manufacturer: 'mfr-001',
  purchaser: 'purchaser-001',
  asset_specification: 'Custom industrial pump, spec v3.2',
  milestone_schedule: [
    { milestone: 'Design complete', due_date: '2026-03-01', payment: 10000 },
    { milestone: 'Fabrication complete', due_date: '2026-06-01', payment: 20000 },
  ],
  delivery_requirements: 'Delivered to site, installed and tested',
  payment_schedule: [{ date: '2026-03-01', amount: 10000, currency: 'USD' }],
  completion_conditions: 'Passed factory acceptance test',
};

describe('validateIstisnaContract', () => {
  it('validates a valid istisna contract', () => {
    const result = validateIstisnaContract(validIstisna);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when manufacturer is missing', () => {
    const result = validateIstisnaContract({ ...validIstisna, manufacturer: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('manufacturer is required');
  });

  it('fails when purchaser is missing', () => {
    const result = validateIstisnaContract({ ...validIstisna, purchaser: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('purchaser is required');
  });

  it('fails when asset_specification is missing', () => {
    const result = validateIstisnaContract({ ...validIstisna, asset_specification: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('asset_specification is required');
  });

  it('fails when milestone_schedule is empty', () => {
    const result = validateIstisnaContract({ ...validIstisna, milestone_schedule: [] });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('milestone_schedule is required');
  });

  it('fails when delivery_requirements is missing', () => {
    const result = validateIstisnaContract({ ...validIstisna, delivery_requirements: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('delivery_requirements is required');
  });

  it('fails when completion_conditions is missing', () => {
    const result = validateIstisnaContract({ ...validIstisna, completion_conditions: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('completion_conditions is required');
  });
});

// --- PartnershipContract ---
const validMusharaka: PartnershipContract = {
  contract_id: 'ctr-005',
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

describe('validatePartnershipContract', () => {
  it('validates a valid musharaka contract', () => {
    const result = validatePartnershipContract(validMusharaka);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when fewer than 2 partners', () => {
    const result = validatePartnershipContract({ ...validMusharaka, partners: ['partner-A'] });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('at least two partners are required');
  });

  it('fails when profit ratios do not sum to 100', () => {
    const result = validatePartnershipContract({
      ...validMusharaka,
      profit_ratio_by_partner: { 'partner-A': 50, 'partner-B': 30 },
    });
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toMatch(/profit_ratio_by_partner must sum to 100%/);
  });

  it('fails when loss ratios do not sum to 100', () => {
    const result = validatePartnershipContract({
      ...validMusharaka,
      loss_ratio_by_partner: { 'partner-A': 40, 'partner-B': 40 },
    });
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toMatch(/loss_ratio_by_partner must sum to 100%/);
  });

  it('fails when guaranteed_return is true (riba)', () => {
    const result = validatePartnershipContract({ ...validMusharaka, guaranteed_return: true });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('guaranteed return is prohibited in partnership contracts (riba)');
  });

  it('fails when liquidation_rules is missing', () => {
    const result = validatePartnershipContract({ ...validMusharaka, liquidation_rules: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('liquidation_rules is required');
  });

  it('fails when negligence_rules is missing', () => {
    const result = validatePartnershipContract({ ...validMusharaka, negligence_rules: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('negligence_rules is required');
  });
});

// --- IjarahContract ---
const validIjarah: IjarahContract = {
  contract_id: 'ctr-006',
  contract_type: 'ijarah',
  lessor: 'lessor-001',
  lessee: 'lessee-001',
  leased_asset: 'Commercial vehicle fleet',
  lease_duration: 24,
  rent_schedule: [{ date: '2026-02-01', amount: 5000, currency: 'USD' }],
  maintenance_obligations: 'Lessor responsible for major maintenance',
};

describe('validateIjarahContract', () => {
  it('validates a valid ijarah contract', () => {
    const result = validateIjarahContract(validIjarah);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when lessor is missing', () => {
    const result = validateIjarahContract({ ...validIjarah, lessor: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('lessor is required');
  });

  it('fails when lessee is missing', () => {
    const result = validateIjarahContract({ ...validIjarah, lessee: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('lessee is required');
  });

  it('fails when leased_asset is missing', () => {
    const result = validateIjarahContract({ ...validIjarah, leased_asset: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('leased_asset is required');
  });

  it('fails when lease_duration is zero', () => {
    const result = validateIjarahContract({ ...validIjarah, lease_duration: 0 });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('lease_duration must be positive');
  });

  it('fails when rent_schedule is empty', () => {
    const result = validateIjarahContract({ ...validIjarah, rent_schedule: [] });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('rent_schedule is required');
  });

  it('fails when maintenance_obligations is missing', () => {
    const result = validateIjarahContract({ ...validIjarah, maintenance_obligations: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('maintenance_obligations is required');
  });
});

// --- AgencyContract ---
const validAgency: AgencyContract = {
  contract_id: 'ctr-007',
  contract_type: 'wakala',
  principal: 'principal-001',
  agent: 'agent-001',
  authorized_scope: 'Purchase of commodities on behalf of principal',
  fee_structure: 'Fixed 2% of transaction value',
  reimbursement_policy: 'All documented expenses reimbursed within 30 days',
  reporting_requirements: 'Monthly transaction report',
  revocation_rules: '14-day written notice required',
};

describe('validateAgencyContract', () => {
  it('validates a valid wakala contract', () => {
    const result = validateAgencyContract(validAgency);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when principal is missing', () => {
    const result = validateAgencyContract({ ...validAgency, principal: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('principal is required');
  });

  it('fails when agent is missing', () => {
    const result = validateAgencyContract({ ...validAgency, agent: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('agent is required');
  });

  it('fails when authorized_scope is missing', () => {
    const result = validateAgencyContract({ ...validAgency, authorized_scope: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('authorized_scope is required');
  });

  it('fails when fee_structure is missing', () => {
    const result = validateAgencyContract({ ...validAgency, fee_structure: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('fee_structure is required');
  });

  it('fails when reimbursement_policy is missing', () => {
    const result = validateAgencyContract({ ...validAgency, reimbursement_policy: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('reimbursement_policy is required');
  });

  it('fails when reporting_requirements is missing', () => {
    const result = validateAgencyContract({ ...validAgency, reporting_requirements: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('reporting_requirements is required');
  });

  it('fails when revocation_rules is missing', () => {
    const result = validateAgencyContract({ ...validAgency, revocation_rules: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('revocation_rules is required');
  });
});

// --- QardContract ---
const validQard: QardContract = {
  contract_id: 'ctr-008',
  contract_type: 'qard',
  lender: 'lender-001',
  borrower: 'borrower-001',
  principal_amount: 10000,
  repayment_schedule: [{ date: '2027-01-01', amount: 10000, currency: 'USD' }],
};

describe('validateQardContract', () => {
  it('validates a valid qard contract', () => {
    const result = validateQardContract(validQard);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when lender is missing', () => {
    const result = validateQardContract({ ...validQard, lender: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('lender is required');
  });

  it('fails when borrower is missing', () => {
    const result = validateQardContract({ ...validQard, borrower: '' });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('borrower is required');
  });

  it('fails when principal_amount is zero', () => {
    const result = validateQardContract({ ...validQard, principal_amount: 0 });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('principal_amount must be positive');
  });

  it('fails when repayment_schedule is empty', () => {
    const result = validateQardContract({ ...validQard, repayment_schedule: [] });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('repayment_schedule is required');
  });

  it('fails when guaranteed_excess is true (riba)', () => {
    const result = validateQardContract({ ...validQard, guaranteed_excess: true });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('qard: guaranteed excess is prohibited (riba)');
  });

  it('fails when hidden_return is true (riba)', () => {
    const result = validateQardContract({ ...validQard, hidden_return: true });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('qard: hidden return is prohibited (riba)');
  });
});

// --- Prohibited Industry ---
describe('validateProhibitedIndustry', () => {
  it('returns valid for a clean description', () => {
    const result = validateProhibitedIndustry('Halal food distribution and logistics');
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects alcohol', () => {
    const result = validateProhibitedIndustry('Alcohol beverage import');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Prohibited industry detected: alcohol');
  });

  it('detects gambling', () => {
    const result = validateProhibitedIndustry('Online gambling platform');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Prohibited industry detected: gambling');
  });

  it('detects riba', () => {
    const result = validateProhibitedIndustry('Interest and riba-based lending');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Prohibited industry detected: riba');
  });

  it('detects multiple prohibited industries', () => {
    const result = validateProhibitedIndustry('Alcohol and gambling operations');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('detects gharar', () => {
    const result = validateProhibitedIndustry('Financial derivatives with gharar elements');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Prohibited industry detected: gharar');
  });
});
