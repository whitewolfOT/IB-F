import { v4 as uuidv4 } from 'uuid';
import { IcosDb, DbConfigEntry, DbConfigProposal } from '../db';
import { OrgRole } from '../types';

export const CONFIG_DEFAULTS = {
  'compliance.weight.noRiba':            { value: 40,      type: 'number' as const, description: 'Weight for no-riba criterion (0–100)' },
  'compliance.weight.noGharar':          { value: 25,      type: 'number' as const, description: 'Weight for no-gharar criterion (0–100)' },
  'compliance.weight.assetBacked':       { value: 15,      type: 'number' as const, description: 'Weight for asset-backed criterion (0–100)' },
  'compliance.weight.ownershipValid':    { value: 10,      type: 'number' as const, description: 'Weight for ownership-valid criterion (0–100)' },
  'compliance.weight.properRiskSharing': { value: 10,      type: 'number' as const, description: 'Weight for risk-sharing criterion (0–100)' },
  'compliance.scoreGate':                { value: 40,      type: 'number' as const, description: 'Pipeline blocked if score falls below this value' },
  'approval.murabahaThreshold':          { value: 500000,  type: 'number' as const, description: 'USD value above which murabaha requires 3-signature approval' },
  'approval.authorityMatrix':            { value: { small_inventory_transfer: 'warehouse_manager', large_capital_deployment: 'financial_controller', novel_contract_structure: 'senior_shariah_board', high_risk_counterparty: 'risk_officer', zakat_calculation_dispute: 'compliance_officer' }, type: 'json' as const, description: 'Maps condition names to the OrgRole required to approve them' },
  'prohibited.industries':               { value: ['alcohol','gambling','pornography','interest-based banking','fraud','prohibited food','exploitative','speculative financial derivatives','riba','maysir','gharar'], type: 'array' as const, description: 'String-match blocklist applied at event intake' },
  'contract.templates':                  { value: [
    { id: 'tmpl-murabaha',  name: 'Standard murabaha',            contract_type: 'murabaha',  variable_fields: ['asset_description','sale_price','purchase_cost','delivery_date','delivery_location'] },
    { id: 'tmpl-salam',    name: 'Agricultural salam',            contract_type: 'salam',     variable_fields: ['commodity_type','quantity','unit','delivery_date','delivery_location'] },
    { id: 'tmpl-istisna',  name: 'Equipment istisna',             contract_type: 'istisna',   variable_fields: ['asset_specification','delivery_requirements','milestone_schedule'] },
    { id: 'tmpl-mudaraba', name: 'Mudaraba investment',           contract_type: 'mudaraba',  variable_fields: ['capital_amount','profit_ratio_by_partner','liquidation_rules'] },
    { id: 'tmpl-qard',     name: 'Simple qard (benevolent loan)', contract_type: 'qard',      variable_fields: ['principal_amount','repayment_schedule'] },
  ], type: 'json' as const, description: '5 pilot contract templates' },
};

export function seedConfigIfEmpty(db: IcosDb): void {
  const existing = db.listConfig();
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const [key, def] of Object.entries(CONFIG_DEFAULTS)) {
    db.upsertConfig({
      config_key: key,
      config_value: JSON.stringify(def.value),
      value_type: def.type,
      description: def.description,
      updated_at: now,
      updated_by: 'system',
    });
  }
}

export class ConfigService {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private readonly TTL_MS = 60_000;

  constructor(private readonly db: IcosDb) {}

  private get<T>(key: string): T {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const row = this.db.getConfig(key);
    if (!row) throw new Error(`Config key not found: ${key}. Run seedConfigIfEmpty() on startup.`);
    const value = JSON.parse(row.config_value) as T;
    this.cache.set(key, { value, expiresAt: Date.now() + this.TTL_MS });
    return value;
  }

  private invalidate(key: string): void { this.cache.delete(key); }

  getComplianceWeights() {
    return {
      noRiba:            this.get<number>('compliance.weight.noRiba'),
      noGharar:          this.get<number>('compliance.weight.noGharar'),
      assetBacked:       this.get<number>('compliance.weight.assetBacked'),
      ownershipValid:    this.get<number>('compliance.weight.ownershipValid'),
      properRiskSharing: this.get<number>('compliance.weight.properRiskSharing'),
    };
  }

  getScoreGate(): number { return this.get<number>('compliance.scoreGate'); }
  getMurabahaThreshold(): number { return this.get<number>('approval.murabahaThreshold'); }
  getAuthorityMatrix(): Record<string, OrgRole> { return this.get('approval.authorityMatrix'); }
  getProhibitedIndustries(): string[] { return this.get<string[]>('prohibited.industries'); }
  getContractTemplates(): unknown[] { return this.get<unknown[]>('contract.templates'); }

  propose(key: string, newValue: unknown, proposedBy: string): string {
    const current = this.db.getConfig(key);
    if (!current) throw new Error(`Unknown config key: ${key}`);
    const proposalId = uuidv4();
    this.db.insertProposal({
      proposal_id: proposalId,
      config_key: key,
      current_value: current.config_value,
      proposed_value: JSON.stringify(newValue),
      proposed_by: proposedBy,
      proposed_at: new Date().toISOString(),
      status: 'pending',
      decided_by: null,
      decided_at: null,
      rejection_reason: null,
    });
    return proposalId;
  }

  ratify(proposalId: string, ratifiedBy: string): void {
    const proposal = this.db.getProposal(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status !== 'pending') throw new Error(`Proposal is already ${proposal.status}`);
    const existing = this.db.getConfig(proposal.config_key)!;
    this.db.upsertConfig({
      config_key: proposal.config_key,
      config_value: proposal.proposed_value,
      value_type: existing.value_type,
      description: existing.description,
      updated_at: new Date().toISOString(),
      updated_by: ratifiedBy,
    });
    this.db.updateProposalStatus(proposalId, 'ratified', ratifiedBy);
    this.invalidate(proposal.config_key);
  }

  reject(proposalId: string, rejectedBy: string, reason: string): void {
    const proposal = this.db.getProposal(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status !== 'pending') throw new Error(`Proposal is already ${proposal.status}`);
    this.db.updateProposalStatus(proposalId, 'rejected', rejectedBy, reason);
  }

  getPendingProposals() { return this.db.getPendingProposals(); }
  getProposal(id: string) { return this.db.getProposal(id); }
}
