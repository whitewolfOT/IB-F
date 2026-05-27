export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

export function assetValuation(quantity: number, unitPrice: number, qualityAdjustment: number): number {
  if (quantity < 0) throw new FormulaError('quantity must be non-negative');
  if (unitPrice < 0) throw new FormulaError('unitPrice must be non-negative');
  if (qualityAdjustment < 0 || qualityAdjustment > 1) throw new FormulaError('qualityAdjustment must be between 0 and 1');
  return quantity * unitPrice * qualityAdjustment;
}

export function murabahaProfit(salePrice: number, purchaseCost: number): { profit: number; margin: number } {
  if (purchaseCost <= 0) throw new FormulaError('purchaseCost must be positive');
  if (salePrice < purchaseCost) throw new FormulaError('salePrice must be >= purchaseCost');
  const profit = salePrice - purchaseCost;
  const margin = profit / purchaseCost;
  return { profit, margin };
}

export function partnershipProfitAllocation(realizedProfit: number, profitRatios: Record<string, number>): Record<string, number> {
  if (realizedProfit < 0) throw new FormulaError('realizedProfit must be non-negative');
  const total = Object.values(profitRatios).reduce((s, r) => s + r, 0);
  if (Math.abs(total - 1.0) > 0.0001) throw new FormulaError('profitRatios must sum to 1.0 (100%)');
  return Object.fromEntries(Object.entries(profitRatios).map(([k, r]) => [k, realizedProfit * r]));
}

export function partnershipLossAllocation(totalLoss: number, capitalExposureRatios: Record<string, number>): Record<string, number> {
  if (totalLoss < 0) throw new FormulaError('totalLoss must be non-negative');
  const total = Object.values(capitalExposureRatios).reduce((s, r) => s + r, 0);
  if (Math.abs(total - 1.0) > 0.0001) throw new FormulaError('capitalExposureRatios must sum to 1.0 (100%)');
  return Object.fromEntries(Object.entries(capitalExposureRatios).map(([k, r]) => [k, totalLoss * r]));
}

export function inventorySpoilage(spoiledQuantity: number, unitCost: number, grossInventoryValue: number): { spoilageLoss: number; netInventoryValue: number } {
  if (spoiledQuantity < 0) throw new FormulaError('spoiledQuantity must be non-negative');
  if (unitCost < 0) throw new FormulaError('unitCost must be non-negative');
  if (grossInventoryValue < 0) throw new FormulaError('grossInventoryValue must be non-negative');
  const spoilageLoss = spoiledQuantity * unitCost;
  const netInventoryValue = grossInventoryValue - spoilageLoss;
  return { spoilageLoss, netInventoryValue };
}

export function salamExposure(contractQuantity: number, deliveredQuantity: number, referenceMarketPrice: number): { outstandingQuantity: number; exposureValue: number } {
  if (contractQuantity < 0) throw new FormulaError('contractQuantity must be non-negative');
  if (deliveredQuantity < 0) throw new FormulaError('deliveredQuantity must be non-negative');
  if (deliveredQuantity > contractQuantity) throw new FormulaError('deliveredQuantity cannot exceed contractQuantity');
  if (referenceMarketPrice < 0) throw new FormulaError('referenceMarketPrice must be non-negative');
  const outstandingQuantity = contractQuantity - deliveredQuantity;
  const exposureValue = outstandingQuantity * referenceMarketPrice;
  return { outstandingQuantity, exposureValue };
}

export function leaseRevenue(leasePaymentRate: number, elapsedLeaseTime: number, collectedPayments: number): { earnedRevenue: number; unearnedLiability: number } {
  if (leasePaymentRate < 0) throw new FormulaError('leasePaymentRate must be non-negative');
  if (elapsedLeaseTime < 0) throw new FormulaError('elapsedLeaseTime must be non-negative');
  if (collectedPayments < 0) throw new FormulaError('collectedPayments must be non-negative');
  const earnedRevenue = leasePaymentRate * elapsedLeaseTime;
  const unearnedLiability = collectedPayments - earnedRevenue;
  return { earnedRevenue, unearnedLiability };
}

export function workingCapital(currentAssets: number, currentLiabilities: number): number {
  if (currentAssets < 0) throw new FormulaError('currentAssets must be non-negative');
  if (currentLiabilities < 0) throw new FormulaError('currentLiabilities must be non-negative');
  return currentAssets - currentLiabilities;
}

export function riskReserveRequirement(riskExposure: number, reserveRatio: number): number {
  if (riskExposure < 0) throw new FormulaError('riskExposure must be non-negative');
  if (reserveRatio < 0 || reserveRatio > 1) throw new FormulaError('reserveRatio must be between 0 and 1');
  return riskExposure * reserveRatio;
}

export function netRealProfit(revenue: number, operationalCosts: number, assetLosses: number, settlementLosses: number): number {
  if (revenue < 0) throw new FormulaError('revenue must be non-negative');
  if (operationalCosts < 0) throw new FormulaError('operationalCosts must be non-negative');
  if (assetLosses < 0) throw new FormulaError('assetLosses must be non-negative');
  if (settlementLosses < 0) throw new FormulaError('settlementLosses must be non-negative');
  return revenue - operationalCosts - assetLosses - settlementLosses;
}
