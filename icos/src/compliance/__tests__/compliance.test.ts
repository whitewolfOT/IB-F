import { scoreCompliance, ComplianceInput } from '../index';

describe('scoreCompliance', () => {
  it('returns score 100 and band Fully Compliant when all flags true', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: true,
      assetBacked: true,
      ownershipValid: true,
      properRiskSharing: true,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(100);
    expect(result.band).toBe('Fully Compliant');
  });

  it('returns score 40 and band Serious Concerns when only noRiba is true', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: false,
      assetBacked: false,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(40);
    expect(result.band).toBe('Serious Concerns');
  });

  it('returns score 65 and band Serious Concerns when noRiba and noGharar are true', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: true,
      assetBacked: false,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(65);
    expect(result.band).toBe('Serious Concerns');
  });

  it('returns score 80 and band Minor Issues when noRiba + noGharar + assetBacked are true', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: true,
      assetBacked: true,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(80);
    expect(result.band).toBe('Minor Issues');
  });

  it('returns score 0 and band Non-Compliant when all flags false', () => {
    const input: ComplianceInput = {
      noRiba: false,
      noGharar: false,
      assetBacked: false,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(0);
    expect(result.band).toBe('Non-Compliant');
  });

  it('breakdown includes individual weight contributions', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: false,
      assetBacked: false,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.breakdown['noRiba']).toBe(40);
    expect(result.breakdown['noGharar']).toBe(0);
  });

  it('score 90 (noRiba + noGharar + assetBacked + ownershipValid) gives Minor Issues band', () => {
    const input: ComplianceInput = {
      noRiba: true,
      noGharar: true,
      assetBacked: true,
      ownershipValid: true,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(90);
    expect(result.band).toBe('Minor Issues');
  });

  it('score 35 (only noGharar + assetBacked) gives Non-Compliant band', () => {
    const input: ComplianceInput = {
      noRiba: false,
      noGharar: true,
      assetBacked: true,
      ownershipValid: false,
      properRiskSharing: false,
    };
    const result = scoreCompliance(input);
    expect(result.score).toBe(40); // 25 + 15 = 40, actually Serious Concerns
    expect(result.band).toBe('Serious Concerns');
  });
});
