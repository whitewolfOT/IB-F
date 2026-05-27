export interface ComplianceInput {
  noRiba: boolean;
  noGharar: boolean;
  assetBacked: boolean;
  ownershipValid: boolean;
  properRiskSharing: boolean;
}

export interface ComplianceScore {
  score: number;
  band: 'Fully Compliant' | 'Minor Issues' | 'Serious Concerns' | 'Non-Compliant';
  breakdown: Record<string, number>;
}

const WEIGHTS = {
  noRiba: 40,
  noGharar: 25,
  assetBacked: 15,
  ownershipValid: 10,
  properRiskSharing: 10,
};

export function scoreCompliance(input: ComplianceInput): ComplianceScore {
  let score = 0;
  const breakdown: Record<string, number> = {};
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const earned = input[key as keyof ComplianceInput] ? weight : 0;
    breakdown[key] = earned;
    score += earned;
  }
  let band: ComplianceScore['band'];
  if (score === 100) band = 'Fully Compliant';
  else if (score >= 70) band = 'Minor Issues';
  else if (score >= 40) band = 'Serious Concerns';
  else band = 'Non-Compliant';
  return { score, band, breakdown };
}
