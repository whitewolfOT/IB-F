import {
  assetValuation,
  murabahaProfit,
  partnershipProfitAllocation,
  partnershipLossAllocation,
  inventorySpoilage,
  salamExposure,
  leaseRevenue,
  workingCapital,
  riskReserveRequirement,
  netRealProfit,
  FormulaError,
} from '../index';

describe('assetValuation', () => {
  it('computes correct valuation', () => {
    expect(assetValuation(10, 100, 0.9)).toBeCloseTo(900);
  });

  it('returns 0 for zero quantity', () => {
    expect(assetValuation(0, 100, 1.0)).toBe(0);
  });

  it('throws on negative quantity', () => {
    expect(() => assetValuation(-1, 100, 1.0)).toThrow(FormulaError);
  });

  it('throws on negative unitPrice', () => {
    expect(() => assetValuation(10, -5, 1.0)).toThrow(FormulaError);
  });

  it('throws on qualityAdjustment > 1', () => {
    expect(() => assetValuation(10, 100, 1.5)).toThrow(FormulaError);
  });

  it('throws on qualityAdjustment < 0', () => {
    expect(() => assetValuation(10, 100, -0.1)).toThrow(FormulaError);
  });
});

describe('murabahaProfit', () => {
  it('computes profit and margin correctly', () => {
    const result = murabahaProfit(1200, 1000);
    expect(result.profit).toBe(200);
    expect(result.margin).toBeCloseTo(0.2);
  });

  it('returns zero profit when salePrice equals purchaseCost', () => {
    const result = murabahaProfit(1000, 1000);
    expect(result.profit).toBe(0);
    expect(result.margin).toBe(0);
  });

  it('throws when purchaseCost is zero', () => {
    expect(() => murabahaProfit(1000, 0)).toThrow(FormulaError);
  });

  it('throws when salePrice < purchaseCost', () => {
    expect(() => murabahaProfit(800, 1000)).toThrow(FormulaError);
  });
});

describe('partnershipProfitAllocation', () => {
  it('allocates profit according to ratios', () => {
    const result = partnershipProfitAllocation(1000, { partnerA: 0.6, partnerB: 0.4 });
    expect(result['partnerA']).toBeCloseTo(600);
    expect(result['partnerB']).toBeCloseTo(400);
  });

  it('handles equal split', () => {
    const result = partnershipProfitAllocation(500, { p1: 0.5, p2: 0.5 });
    expect(result['p1']).toBe(250);
    expect(result['p2']).toBe(250);
  });

  it('throws when ratios do not sum to 1', () => {
    expect(() => partnershipProfitAllocation(1000, { p1: 0.3, p2: 0.4 })).toThrow(FormulaError);
  });

  it('throws when realizedProfit is negative', () => {
    expect(() => partnershipProfitAllocation(-100, { p1: 0.5, p2: 0.5 })).toThrow(FormulaError);
  });
});

describe('partnershipLossAllocation', () => {
  it('allocates loss by capital exposure ratios', () => {
    const result = partnershipLossAllocation(200, { p1: 0.7, p2: 0.3 });
    expect(result['p1']).toBeCloseTo(140);
    expect(result['p2']).toBeCloseTo(60);
  });

  it('handles zero loss', () => {
    const result = partnershipLossAllocation(0, { p1: 0.5, p2: 0.5 });
    expect(result['p1']).toBe(0);
    expect(result['p2']).toBe(0);
  });

  it('throws when ratios do not sum to 1', () => {
    expect(() => partnershipLossAllocation(100, { p1: 0.6, p2: 0.6 })).toThrow(FormulaError);
  });

  it('throws when totalLoss is negative', () => {
    expect(() => partnershipLossAllocation(-50, { p1: 0.5, p2: 0.5 })).toThrow(FormulaError);
  });
});

describe('inventorySpoilage', () => {
  it('computes spoilage loss and net inventory correctly', () => {
    const result = inventorySpoilage(5, 100, 2000);
    expect(result.spoilageLoss).toBe(500);
    expect(result.netInventoryValue).toBe(1500);
  });

  it('returns gross value when no spoilage', () => {
    const result = inventorySpoilage(0, 100, 2000);
    expect(result.spoilageLoss).toBe(0);
    expect(result.netInventoryValue).toBe(2000);
  });

  it('throws when spoiledQuantity is negative', () => {
    expect(() => inventorySpoilage(-1, 100, 2000)).toThrow(FormulaError);
  });

  it('throws when unitCost is negative', () => {
    expect(() => inventorySpoilage(5, -10, 2000)).toThrow(FormulaError);
  });

  it('throws when grossInventoryValue is negative', () => {
    expect(() => inventorySpoilage(5, 100, -1)).toThrow(FormulaError);
  });
});

describe('salamExposure', () => {
  it('computes outstanding quantity and exposure value', () => {
    const result = salamExposure(100, 40, 25);
    expect(result.outstandingQuantity).toBe(60);
    expect(result.exposureValue).toBe(1500);
  });

  it('returns zero exposure when fully delivered', () => {
    const result = salamExposure(100, 100, 25);
    expect(result.outstandingQuantity).toBe(0);
    expect(result.exposureValue).toBe(0);
  });

  it('throws when deliveredQuantity exceeds contractQuantity', () => {
    expect(() => salamExposure(50, 60, 10)).toThrow(FormulaError);
  });

  it('throws when referenceMarketPrice is negative', () => {
    expect(() => salamExposure(100, 50, -5)).toThrow(FormulaError);
  });

  it('throws when contractQuantity is negative', () => {
    expect(() => salamExposure(-10, 0, 10)).toThrow(FormulaError);
  });
});

describe('leaseRevenue', () => {
  it('computes earned revenue and unearned liability correctly', () => {
    const result = leaseRevenue(100, 3, 400);
    expect(result.earnedRevenue).toBe(300);
    expect(result.unearnedLiability).toBe(100);
  });

  it('handles case where collected equals earned', () => {
    const result = leaseRevenue(100, 2, 200);
    expect(result.earnedRevenue).toBe(200);
    expect(result.unearnedLiability).toBe(0);
  });

  it('throws when leasePaymentRate is negative', () => {
    expect(() => leaseRevenue(-10, 3, 400)).toThrow(FormulaError);
  });

  it('throws when elapsedLeaseTime is negative', () => {
    expect(() => leaseRevenue(100, -1, 400)).toThrow(FormulaError);
  });

  it('throws when collectedPayments is negative', () => {
    expect(() => leaseRevenue(100, 3, -50)).toThrow(FormulaError);
  });
});

describe('workingCapital', () => {
  it('computes working capital correctly', () => {
    expect(workingCapital(5000, 3000)).toBe(2000);
  });

  it('returns negative when liabilities exceed assets', () => {
    expect(workingCapital(1000, 4000)).toBe(-3000);
  });

  it('throws when currentAssets is negative', () => {
    expect(() => workingCapital(-100, 500)).toThrow(FormulaError);
  });

  it('throws when currentLiabilities is negative', () => {
    expect(() => workingCapital(500, -100)).toThrow(FormulaError);
  });
});

describe('riskReserveRequirement', () => {
  it('computes reserve requirement correctly', () => {
    expect(riskReserveRequirement(10000, 0.1)).toBe(1000);
  });

  it('returns zero when reserveRatio is 0', () => {
    expect(riskReserveRequirement(10000, 0)).toBe(0);
  });

  it('throws when riskExposure is negative', () => {
    expect(() => riskReserveRequirement(-1000, 0.1)).toThrow(FormulaError);
  });

  it('throws when reserveRatio > 1', () => {
    expect(() => riskReserveRequirement(10000, 1.5)).toThrow(FormulaError);
  });

  it('throws when reserveRatio < 0', () => {
    expect(() => riskReserveRequirement(10000, -0.1)).toThrow(FormulaError);
  });
});

describe('netRealProfit', () => {
  it('computes net real profit correctly', () => {
    expect(netRealProfit(10000, 3000, 500, 200)).toBe(6300);
  });

  it('returns negative net profit when costs exceed revenue', () => {
    expect(netRealProfit(1000, 2000, 0, 0)).toBe(-1000);
  });

  it('throws when revenue is negative', () => {
    expect(() => netRealProfit(-100, 0, 0, 0)).toThrow(FormulaError);
  });

  it('throws when operationalCosts is negative', () => {
    expect(() => netRealProfit(1000, -100, 0, 0)).toThrow(FormulaError);
  });

  it('throws when assetLosses is negative', () => {
    expect(() => netRealProfit(1000, 0, -50, 0)).toThrow(FormulaError);
  });

  it('throws when settlementLosses is negative', () => {
    expect(() => netRealProfit(1000, 0, 0, -50)).toThrow(FormulaError);
  });
});
