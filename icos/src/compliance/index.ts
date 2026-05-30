// ── Layer A — Shariah Validity Gate ──────────────────────────────────────────
// Hard prohibitions: binary nullifiers, not weighted dimensions.
// A single riba violation makes the contract non-compliant — not "less compliant".

export interface ShariahGateInput {
  ribaViolations: string[];
  maysirViolations: string[];
  ghararViolations: string[];
  prohibitedIndustry: boolean;
  ownershipBeforeSale: boolean;
  genuineRiskSharing: boolean;
}

export type ShariahGateStatus = 'pass' | 'fail' | 'conditional';

export interface ShariahGateResult {
  status: ShariahGateStatus;
  nullifiers: string[];
  conditions: string[];
}

export function checkShariahGate(input: ShariahGateInput): ShariahGateResult {
  const nullifiers: string[] = [];
  const conditions: string[] = [];

  for (const v of input.ribaViolations) nullifiers.push(`Riba: ${v}`);
  for (const v of input.maysirViolations) nullifiers.push(`Maysir: ${v}`);

  if (input.prohibitedIndustry) nullifiers.push('Prohibited industry involvement');

  if (input.ghararViolations.length >= 2) {
    nullifiers.push(`Severe gharar — ${input.ghararViolations.join('; ')}`);
  } else if (input.ghararViolations.length === 1) {
    conditions.push(`Minor gharar — review required: ${input.ghararViolations[0]}`);
  }

  if (!input.ownershipBeforeSale) {
    nullifiers.push('Murabaha requires confirmed possession before sale');
  }
  if (!input.genuineRiskSharing) {
    nullifiers.push('Partnership guaranteed return is riba-adjacent — genuine profit/loss sharing required');
  }

  const status: ShariahGateStatus =
    nullifiers.length > 0 ? 'fail' : conditions.length > 0 ? 'conditional' : 'pass';

  return { status, nullifiers, conditions };
}

// ── Layer B — Purification Analysis ──────────────────────────────────────────
// Tolerated impurity threshold framework (AAOIFI / Dow Jones Islamic).
// Estimates purification amount; recommends sadaqah when within tolerance.

export interface PurificationInput {
  totalContractAmount: number;
  impureIncomeEstimate: number;
  methodology: 'AAOIFI' | 'Dow_Jones_Islamic' | 'custom';
  toleranceThreshold?: number;
}

export interface PurificationResult {
  required: boolean;
  impure_ratio: number;
  purification_amount: number;
  methodology: string;
  within_tolerance: boolean;
  sadaqah_recommended: boolean;
  tolerance_threshold: number;
}

export function analyzePurification(input: PurificationInput): PurificationResult {
  const threshold = input.toleranceThreshold ?? 0.05;
  const impure_ratio =
    input.totalContractAmount > 0
      ? input.impureIncomeEstimate / input.totalContractAmount
      : 0;
  const required = input.impureIncomeEstimate > 0;
  const within_tolerance = impure_ratio < threshold;

  return {
    required,
    impure_ratio,
    purification_amount: input.impureIncomeEstimate,
    methodology: input.methodology,
    within_tolerance,
    sadaqah_recommended: required && within_tolerance,
    tolerance_threshold: threshold,
  };
}

// ── Layer C — Operational Integrity Score ────────────────────────────────────
// Weighted quality metrics — THIS is where weights legitimately belong.
// These measure documentation quality, traceability, disclosure, not halal/haram.

export interface OperationalIntegrityInput {
  documentationComplete: boolean;
  assetIdentified: boolean;
  priceDisclosed: boolean;
  deliverySpecified: boolean;
  counterpartiesVerified: boolean;
}

export type OperationalIntegrityBand = 'Excellent' | 'Good' | 'Adequate' | 'Needs Improvement';

export interface OperationalIntegrityResult {
  score: number;
  band: OperationalIntegrityBand;
  breakdown: Record<string, number>;
}

export const DEFAULT_OPERATIONAL_WEIGHTS: Record<keyof OperationalIntegrityInput, number> = {
  documentationComplete: 25,
  assetIdentified: 25,
  priceDisclosed: 20,
  deliverySpecified: 20,
  counterpartiesVerified: 10,
};

export function scoreOperationalIntegrity(
  input: OperationalIntegrityInput,
  weights?: Partial<Record<keyof OperationalIntegrityInput, number>>,
): OperationalIntegrityResult {
  const w = { ...DEFAULT_OPERATIONAL_WEIGHTS, ...weights };
  let score = 0;
  const breakdown: Record<string, number> = {};
  for (const key of Object.keys(w) as (keyof OperationalIntegrityInput)[]) {
    const earned = input[key] ? w[key] : 0;
    breakdown[key] = earned;
    score += earned;
  }
  let band: OperationalIntegrityBand;
  if (score >= 85) band = 'Excellent';
  else if (score >= 70) band = 'Good';
  else if (score >= 50) band = 'Adequate';
  else band = 'Needs Improvement';
  return { score, band, breakdown };
}

// ── Combined Assessment ───────────────────────────────────────────────────────

export interface ComplianceAssessment {
  shariahGate: ShariahGateResult;
  purification: PurificationResult;
  operationalIntegrity: OperationalIntegrityResult;
  passed: boolean;
}
