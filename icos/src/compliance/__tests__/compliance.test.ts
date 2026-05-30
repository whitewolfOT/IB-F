import {
  checkShariahGate, ShariahGateInput,
  analyzePurification,
  scoreOperationalIntegrity, OperationalIntegrityInput,
} from '../index';

// ── Layer A — Shariah Validity Gate ──────────────────────────────────────────

const cleanInput: ShariahGateInput = {
  ribaViolations: [],
  maysirViolations: [],
  ghararViolations: [],
  prohibitedIndustry: false,
  ownershipBeforeSale: true,
  genuineRiskSharing: true,
};

describe('checkShariahGate — Layer A', () => {
  it('passes when no violations', () => {
    const result = checkShariahGate(cleanInput);
    expect(result.status).toBe('pass');
    expect(result.nullifiers).toHaveLength(0);
    expect(result.conditions).toHaveLength(0);
  });

  it('fails on a single riba violation', () => {
    const result = checkShariahGate({ ...cleanInput, ribaViolations: ['guaranteed fixed return on loan'] });
    expect(result.status).toBe('fail');
    expect(result.nullifiers).toHaveLength(1);
    expect(result.nullifiers[0]).toMatch(/Riba/);
  });

  it('fails on maysir violation', () => {
    const result = checkShariahGate({ ...cleanInput, maysirViolations: ['zero-sum speculative structure'] });
    expect(result.status).toBe('fail');
    expect(result.nullifiers[0]).toMatch(/Maysir/);
  });

  it('fails on prohibited industry', () => {
    const result = checkShariahGate({ ...cleanInput, prohibitedIndustry: true });
    expect(result.status).toBe('fail');
    expect(result.nullifiers[0]).toMatch(/Prohibited industry/);
  });

  it('fails on severe gharar (2+ missing elements)', () => {
    const result = checkShariahGate({ ...cleanInput, ghararViolations: ['delivery_date not specified', 'price not defined'] });
    expect(result.status).toBe('fail');
    expect(result.nullifiers[0]).toMatch(/Severe gharar/);
  });

  it('is conditional on minor gharar (1 missing element)', () => {
    const result = checkShariahGate({ ...cleanInput, ghararViolations: ['delivery_date not specified'] });
    expect(result.status).toBe('conditional');
    expect(result.conditions).toHaveLength(1);
    expect(result.nullifiers).toHaveLength(0);
  });

  it('fails when murabaha seller lacks possession', () => {
    const result = checkShariahGate({ ...cleanInput, ownershipBeforeSale: false });
    expect(result.status).toBe('fail');
    expect(result.nullifiers[0]).toMatch(/possession/);
  });

  it('fails when partnership has guaranteed return', () => {
    const result = checkShariahGate({ ...cleanInput, genuineRiskSharing: false });
    expect(result.status).toBe('fail');
    expect(result.nullifiers[0]).toMatch(/guaranteed return/i);
  });

  it('accumulates multiple nullifiers', () => {
    const result = checkShariahGate({
      ...cleanInput,
      ribaViolations: ['fixed rate on loan'],
      prohibitedIndustry: true,
    });
    expect(result.status).toBe('fail');
    expect(result.nullifiers.length).toBeGreaterThanOrEqual(2);
  });

  it('conditions do not count as fail', () => {
    // One minor gharar + all other flags clean
    const result = checkShariahGate({ ...cleanInput, ghararViolations: ['delivery not specified'] });
    expect(result.status).toBe('conditional');
    expect(result.nullifiers).toHaveLength(0);
    expect(result.conditions).toHaveLength(1);
  });
});

// ── Layer B — Purification Analysis ──────────────────────────────────────────

describe('analyzePurification — Layer B', () => {
  it('returns required:false when no impurity', () => {
    const result = analyzePurification({
      totalContractAmount: 100000,
      impureIncomeEstimate: 0,
      methodology: 'AAOIFI',
    });
    expect(result.required).toBe(false);
    expect(result.impure_ratio).toBe(0);
    expect(result.purification_amount).toBe(0);
    expect(result.sadaqah_recommended).toBe(false);
  });

  it('calculates impure ratio and is within tolerance at 3%', () => {
    const result = analyzePurification({
      totalContractAmount: 100000,
      impureIncomeEstimate: 3000,
      methodology: 'AAOIFI',
    });
    expect(result.required).toBe(true);
    expect(result.impure_ratio).toBeCloseTo(0.03);
    expect(result.within_tolerance).toBe(true);  // 3% < 5% threshold
    expect(result.sadaqah_recommended).toBe(true);
    expect(result.purification_amount).toBe(3000);
  });

  it('marks as outside tolerance when impurity exceeds 5%', () => {
    const result = analyzePurification({
      totalContractAmount: 100000,
      impureIncomeEstimate: 8000,
      methodology: 'AAOIFI',
    });
    expect(result.within_tolerance).toBe(false);
    expect(result.sadaqah_recommended).toBe(false);
  });

  it('respects custom tolerance threshold', () => {
    const result = analyzePurification({
      totalContractAmount: 100000,
      impureIncomeEstimate: 8000,
      methodology: 'custom',
      toleranceThreshold: 0.1,
    });
    expect(result.within_tolerance).toBe(true); // 8% < 10% custom threshold
    expect(result.tolerance_threshold).toBe(0.1);
  });
});

// ── Layer C — Operational Integrity Score ────────────────────────────────────

const fullInput: OperationalIntegrityInput = {
  documentationComplete: true,
  assetIdentified: true,
  priceDisclosed: true,
  deliverySpecified: true,
  counterpartiesVerified: true,
};

describe('scoreOperationalIntegrity — Layer C', () => {
  it('returns score 100 and band Excellent when all criteria met', () => {
    const result = scoreOperationalIntegrity(fullInput);
    expect(result.score).toBe(100);
    expect(result.band).toBe('Excellent');
  });

  it('returns Needs Improvement when most criteria missing', () => {
    const result = scoreOperationalIntegrity({
      documentationComplete: false,
      assetIdentified: false,
      priceDisclosed: false,
      deliverySpecified: false,
      counterpartiesVerified: true,
    });
    expect(result.score).toBe(10); // only counterpartiesVerified (10 pts)
    expect(result.band).toBe('Needs Improvement');
  });

  it('band is Good at 70 points', () => {
    const result = scoreOperationalIntegrity({
      documentationComplete: true,   // 25
      assetIdentified: true,         // 25
      priceDisclosed: true,          // 20
      deliverySpecified: false,      // 0
      counterpartiesVerified: false, // 0
    });
    expect(result.score).toBe(70);
    expect(result.band).toBe('Good');
  });

  it('band is Adequate at 50 points', () => {
    const result = scoreOperationalIntegrity({
      documentationComplete: true,   // 25
      assetIdentified: true,         // 25
      priceDisclosed: false,
      deliverySpecified: false,
      counterpartiesVerified: false,
    });
    expect(result.score).toBe(50);
    expect(result.band).toBe('Adequate');
  });

  it('breakdown tracks individual contributions', () => {
    const result = scoreOperationalIntegrity({
      ...fullInput,
      documentationComplete: false,
    });
    expect(result.breakdown.documentationComplete).toBe(0);
    expect(result.breakdown.assetIdentified).toBe(25);
    expect(result.score).toBe(75);
  });

  it('accepts custom weights', () => {
    const result = scoreOperationalIntegrity(fullInput, {
      documentationComplete: 50,
      assetIdentified: 50,
      priceDisclosed: 0,
      deliverySpecified: 0,
      counterpartiesVerified: 0,
    });
    expect(result.score).toBe(100);
  });
});
