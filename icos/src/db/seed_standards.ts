import { v4 as uuidv4 } from 'uuid';
import { IcosDb, DbStandard } from './index';

export const AAOIFI_SEED_STANDARDS: Omit<DbStandard, 'standard_id' | 'created_at'>[] = [
  { code: 'SS-2',  title: 'Murabaha and Murabaha to the Purchase Orderer', summary: 'Governs cost-plus sale financing structures and disclosure requirements', active: true },
  { code: 'SS-9',  title: 'Ijarah and Ijarah Muntahia Bittamleek', summary: 'Governs lease and lease-to-own contracts', active: true },
  { code: 'SS-10', title: 'Salam and Parallel Salam', summary: 'Governs forward sale with upfront payment', active: true },
  { code: 'SS-11', title: 'Istisna and Parallel Istisna', summary: 'Governs manufactured goods contracts', active: true },
  { code: 'SS-12', title: 'Sharika (Musharaka) and Modern Corporations', summary: 'Governs joint venture and partnership structures', active: true },
  { code: 'SS-13', title: 'Mudaraba', summary: 'Governs profit-sharing investment arrangements', active: true },
  { code: 'SS-17', title: 'Investment Sukuk', summary: 'Governs Shariah-compliant bond structures', active: true },
  { code: 'SS-21', title: 'Financial Paper (Shares and Bonds)', summary: 'Governs trading of financial instruments', active: true },
  { code: 'SS-28', title: 'Banking Services', summary: 'Governs Shariah requirements for banking operations', active: true },
];

export function seedStandardsIfEmpty(db: IcosDb): void {
  const existing = db.listStandards(false);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  for (const seed of AAOIFI_SEED_STANDARDS) {
    db.insertStandard({ standard_id: uuidv4(), created_at: now, ...seed });
  }
}
