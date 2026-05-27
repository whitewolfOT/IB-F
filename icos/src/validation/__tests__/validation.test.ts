import { detectRiba, detectGharar, detectMaysir, detectFromContract, GhararInput } from '../index';
import { SaleContract, QardContract, SalamContract, PartnershipContract } from '../../contracts/schemas';

// ── detectRiba ──────────────────────────────────────────────────────────────

describe('detectRiba', () => {
  it('returns empty array for clean input', () => {
    expect(detectRiba({})).toHaveLength(0);
  });

  it('detects guaranteed_return', () => {
    const v = detectRiba({ guaranteed_return: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/guaranteed return/);
  });

  it('detects has_interest_clause', () => {
    const v = detectRiba({ has_interest_clause: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/has_interest_clause/);
  });

  it('detects debt_increases_over_time (riba al-nasia)', () => {
    const v = detectRiba({ debt_increases_over_time: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/debt_increases_over_time/);
  });

  it('detects currency_exchange_mismatch (riba al-fadl)', () => {
    const v = detectRiba({ currency_exchange_mismatch: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/currency_exchange_mismatch/);
  });

  it('detects penalty_profit_clause', () => {
    const v = detectRiba({ penalty_profit_clause: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/penalty_profit_clause/);
  });

  it('returns 5 violations when all riba types present', () => {
    const v = detectRiba({
      guaranteed_return: true,
      has_interest_clause: true,
      debt_increases_over_time: true,
      currency_exchange_mismatch: true,
      penalty_profit_clause: true,
    });
    expect(v).toHaveLength(5);
  });
});

// ── detectGharar ────────────────────────────────────────────────────────────

const fullGharar: GhararInput = {
  asset_defined: true,
  delivery_date_specified: true,
  delivery_location_specified: true,
  ownership_clear: true,
  price_defined: true,
  key_terms_present: true,
};

describe('detectGharar', () => {
  it('returns empty array for fully-specified contract', () => {
    expect(detectGharar(fullGharar)).toHaveLength(0);
  });

  it('detects missing asset definition', () => {
    const v = detectGharar({ ...fullGharar, asset_defined: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/asset/);
  });

  it('detects missing delivery date', () => {
    const v = detectGharar({ ...fullGharar, delivery_date_specified: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/delivery date/);
  });

  it('detects missing delivery location', () => {
    const v = detectGharar({ ...fullGharar, delivery_location_specified: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/delivery location/);
  });

  it('detects unclear ownership', () => {
    const v = detectGharar({ ...fullGharar, ownership_clear: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/ownership/);
  });

  it('detects undefined price', () => {
    const v = detectGharar({ ...fullGharar, price_defined: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/price/);
  });

  it('detects absent key terms', () => {
    const v = detectGharar({ ...fullGharar, key_terms_present: false });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/terms/);
  });

  it('returns 6 violations when all fields are false', () => {
    const v = detectGharar({
      asset_defined: false,
      delivery_date_specified: false,
      delivery_location_specified: false,
      ownership_clear: false,
      price_defined: false,
      key_terms_present: false,
    });
    expect(v).toHaveLength(6);
  });
});

// ── detectMaysir ────────────────────────────────────────────────────────────

describe('detectMaysir', () => {
  it('returns empty array for real-asset transaction', () => {
    expect(detectMaysir({})).toHaveLength(0);
  });

  it('detects zero_sum_structure', () => {
    const v = detectMaysir({ zero_sum_structure: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/zero-sum/);
  });

  it('detects outcome_depends_on_chance', () => {
    const v = detectMaysir({ outcome_depends_on_chance: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/chance/);
  });

  it('detects no_underlying_real_asset', () => {
    const v = detectMaysir({ no_underlying_real_asset: true });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/real asset/);
  });

  it('returns 3 violations when all maysir types present', () => {
    const v = detectMaysir({
      zero_sum_structure: true,
      outcome_depends_on_chance: true,
      no_underlying_real_asset: true,
    });
    expect(v).toHaveLength(3);
  });
});

// ── detectFromContract ──────────────────────────────────────────────────────

describe('detectFromContract - murabaha with possession', () => {
  const murabaha: SaleContract = {
    contract_id: 'ctr-001',
    contract_type: 'murabaha',
    seller: 'seller-001',
    buyer: 'buyer-001',
    asset_description: 'Grade A Wheat',
    quantity: 100,
    unit: 'tons',
    quality_grade: 'A',
    purchase_cost: 8000,
    sale_price: 10000,
    currency: 'USD',
    delivery_date: '2026-06-01',
    delivery_location: 'Warehouse A',
    payment_schedule: [],
    title_transfer_rule: 'on_delivery',
    possession_status: 'in_possession',
    requires_cost_disclosure: true,
    requires_asset_ownership_before_sale: true,
    profit_must_be_fixed_and_known: true,
  };

  it('passes all checks for valid murabaha with possession', () => {
    const report = detectFromContract(murabaha);
    expect(report.ribaViolations).toHaveLength(0);
    expect(report.ghararViolations).toHaveLength(0);
    expect(report.maysirViolations).toHaveLength(0);
  });

  it('reports gharar when murabaha seller not in possession', () => {
    const report = detectFromContract({ ...murabaha, possession_status: 'not_in_possession' });
    expect(report.ghararViolations.length).toBeGreaterThan(0);
    expect(report.ghararViolations.some(v => v.includes('ownership'))).toBe(true);
  });
});

describe('detectFromContract - qard with guaranteed_excess', () => {
  const badQard: QardContract = {
    contract_id: 'qard-001',
    contract_type: 'qard',
    lender: 'bank-001',
    borrower: 'borrower-001',
    principal_amount: 10000,
    repayment_schedule: [{ date: '2027-01-01', amount: 10500, currency: 'USD' }],
    guaranteed_excess: true,
  };

  it('detects riba from guaranteed_excess in qard', () => {
    const report = detectFromContract(badQard);
    expect(report.ribaViolations.length).toBeGreaterThan(0);
    expect(report.ribaViolations.some(v => v.includes('guaranteed return'))).toBe(true);
  });

  it('valid qard without excess has no riba violations', () => {
    const good: QardContract = { ...badQard, guaranteed_excess: false };
    const report = detectFromContract(good);
    expect(report.ribaViolations).toHaveLength(0);
  });
});

describe('detectFromContract - salam with ambiguous commodity', () => {
  const badSalam: SalamContract = {
    contract_id: 'salam-001',
    contract_type: 'salam',
    buyer: 'buyer-001',
    seller: 'farmer-001',
    commodity_type: 'grain',
    quantity: 500,
    quality_specification: 'TBD',
    payment_amount: 5000,
    payment_timestamp: '2026-01-01T00:00:00Z',
    payment_completed: true,
    delivery_date: '2026-09-01',
    delivery_location: 'Warehouse A',
    commodity_specification_is_ambiguous: true,
  };

  it('detects gharar from ambiguous salam commodity specification', () => {
    const report = detectFromContract(badSalam);
    expect(report.ghararViolations.length).toBeGreaterThan(0);
    expect(report.ghararViolations.some(v => v.includes('terms'))).toBe(true);
  });

  it('valid salam has no gharar violations', () => {
    const good: SalamContract = { ...badSalam, commodity_specification_is_ambiguous: false };
    const report = detectFromContract(good);
    expect(report.ghararViolations).toHaveLength(0);
  });
});

describe('detectFromContract - partnership with guaranteed_return', () => {
  const badMusharaka: PartnershipContract = {
    contract_id: 'musharaka-001',
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
    guaranteed_return: true,
  };

  it('detects riba from guaranteed_return in musharaka', () => {
    const report = detectFromContract(badMusharaka);
    expect(report.ribaViolations.length).toBeGreaterThan(0);
    expect(report.ribaViolations.some(v => v.includes('guaranteed return'))).toBe(true);
  });

  it('valid musharaka without guaranteed_return has no riba violations', () => {
    const good: PartnershipContract = { ...badMusharaka, guaranteed_return: false };
    const report = detectFromContract(good);
    expect(report.ribaViolations).toHaveLength(0);
  });
});
