import { MADHHAB_CONTRACT_ALIGNMENT, MadhhabSpecialization } from '../index';
import { ContractType } from '../../types';

describe('MADHHAB_CONTRACT_ALIGNMENT', () => {
  it('Hanafi includes murabaha', () => {
    expect(MADHHAB_CONTRACT_ALIGNMENT.Hanafi).toContain('murabaha');
  });

  it('Hanafi includes istisna', () => {
    expect(MADHHAB_CONTRACT_ALIGNMENT.Hanafi).toContain('istisna');
  });

  it('Maliki includes murabaha', () => {
    expect(MADHHAB_CONTRACT_ALIGNMENT.Maliki).toContain('murabaha');
  });

  it('all entries contain only valid ContractType values', () => {
    const validTypes = Object.values(ContractType) as string[];
    for (const [madhhab, types] of Object.entries(MADHHAB_CONTRACT_ALIGNMENT)) {
      for (const t of types) {
        expect(validTypes).toContain(t);
      }
      void madhhab;
    }
  });

  it('Other is not a key in MADHHAB_CONTRACT_ALIGNMENT', () => {
    expect(Object.keys(MADHHAB_CONTRACT_ALIGNMENT)).not.toContain('Other');
    expect(Object.keys(MADHHAB_CONTRACT_ALIGNMENT)).not.toContain('Jafari');
  });

  it('MadhhabSpecialization only contains the four canonical madhahib', () => {
    const values = Object.values(MadhhabSpecialization);
    expect(values).toEqual(['Hanafi', 'Maliki', 'Shafii', 'Hanbali']);
    expect(values).not.toContain('Jafari');
    expect(values).not.toContain('Other');
  });
});
