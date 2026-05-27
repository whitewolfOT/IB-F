export interface TransactionDescriptor {
  ownership_transfer: boolean;
  immediate_delivery: boolean;
  goods_standardized: boolean;
  manufactured_later: boolean;
  usufruct_transferred: boolean;
  single_capital_provider: boolean;
  labor_from_second_party: boolean;
  multiple_capital_providers: boolean;
  payment_timing: 'immediate' | 'deferred' | 'installment';
  asset_fields_present: string[];
}

export interface ClassificationResult {
  contract_type: string;
  shariah_status: 'compliant' | 'requires_review' | 'non_compliant';
  violations: string[];
  risk_flags: string[];
  required_missing_fields: string[];
  confidence_score: number;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  murabaha: ['ownership_transfer', 'immediate_delivery', 'asset_description', 'purchase_cost', 'sale_price', 'possession_status', 'requires_cost_disclosure'],
  spot_sale: ['ownership_transfer', 'immediate_delivery', 'asset_description', 'quantity', 'sale_price'],
  salam: ['ownership_transfer', 'payment_timing', 'goods_standardized', 'delivery_date', 'delivery_location', 'payment_amount'],
  istisna: ['ownership_transfer', 'manufactured_later', 'asset_specification', 'milestone_schedule', 'delivery_requirements'],
  ijarah: ['usufruct_transferred', 'leased_asset', 'lease_duration', 'rent_schedule', 'maintenance_obligations'],
  mudaraba: ['single_capital_provider', 'labor_from_second_party', 'profit_ratio_by_partner', 'capital_contribution'],
  musharaka: ['multiple_capital_providers', 'profit_ratio_by_partner', 'loss_ratio_by_partner', 'capital_contribution'],
};

function computeConfidence(contractType: string, presentFields: string[], pathCount: number): number {
  const required = REQUIRED_FIELDS[contractType] || [];
  if (required.length === 0) return 0.5;
  const presentCount = required.filter(f => presentFields.includes(f)).length;
  const base = presentCount / required.length;
  const multiplier = pathCount === 1 ? 1.0 : pathCount === 2 ? 0.7 : 0.5;
  return Math.round(base * multiplier * 100) / 100;
}

export function classify(descriptor: TransactionDescriptor): ClassificationResult {
  const violations: string[] = [];
  const risk_flags: string[] = [];
  const required_missing_fields: string[] = [];
  let contract_type = 'unknown';
  let pathCount = 0;

  if (descriptor.ownership_transfer) {
    if (descriptor.immediate_delivery) {
      contract_type = descriptor.asset_fields_present.includes('purchase_cost') ? 'murabaha' : 'spot_sale';
      pathCount = 1;
    } else if (descriptor.manufactured_later) {
      contract_type = 'istisna';
      pathCount = 1;
    } else if (descriptor.goods_standardized && descriptor.payment_timing === 'immediate') {
      contract_type = 'salam';
      pathCount = 1;
    } else {
      contract_type = 'salam';
      pathCount = 2;
      risk_flags.push('ownership_transfer_without_clear_delivery_terms');
    }
  } else {
    if (descriptor.usufruct_transferred) {
      contract_type = 'ijarah';
      pathCount = 1;
    } else if (descriptor.single_capital_provider && descriptor.labor_from_second_party) {
      contract_type = 'mudaraba';
      pathCount = 1;
    } else if (descriptor.multiple_capital_providers) {
      contract_type = 'musharaka';
      pathCount = 1;
    } else {
      contract_type = 'unknown';
      pathCount = 3;
      risk_flags.push('unrecognized_contract_pattern');
      violations.push('contract_type_cannot_be_determined');
    }
  }

  const requiredForType = REQUIRED_FIELDS[contract_type] || [];
  for (const field of requiredForType) {
    if (!descriptor.asset_fields_present.includes(field)) {
      required_missing_fields.push(field);
    }
  }

  const confidence_score = computeConfidence(contract_type, descriptor.asset_fields_present, pathCount);
  const shariah_status = violations.length > 0 ? 'non_compliant'
    : risk_flags.length > 0 ? 'requires_review'
    : 'compliant';

  return { contract_type, shariah_status, violations, risk_flags, required_missing_fields, confidence_score };
}
