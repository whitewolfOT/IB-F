import { SaleContract, SalamContract, IstisnaContract, PartnershipContract, IjarahContract, AgencyContract, QardContract } from './schemas';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

const PROHIBITED_INDUSTRIES = [
  'alcohol', 'gambling', 'pornography', 'interest-based banking',
  'fraud', 'prohibited food', 'exploitative', 'speculative financial derivatives',
  'riba', 'maysir', 'gharar',
];

export function validateProhibitedIndustry(description: string): ValidationResult {
  const lower = description.toLowerCase();
  const violations: string[] = [];
  for (const industry of PROHIBITED_INDUSTRIES) {
    if (lower.includes(industry)) {
      violations.push(`Prohibited industry detected: ${industry}`);
    }
  }
  return { valid: violations.length === 0, violations };
}

export function validateSaleContract(contract: SaleContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.seller) violations.push('seller is required');
  if (!contract.buyer) violations.push('buyer is required');
  if (!contract.asset_description) violations.push('asset_description is required');
  if (contract.quantity <= 0) violations.push('quantity must be positive');
  if (contract.sale_price <= 0) violations.push('sale_price must be positive');
  if (contract.purchase_cost < 0) violations.push('purchase_cost must be non-negative');
  if (!contract.delivery_date) violations.push('delivery_date is required');
  if (!contract.delivery_location) violations.push('delivery_location is required');
  if (contract.contract_type === 'murabaha') {
    if (!contract.requires_cost_disclosure) violations.push('murabaha: requires_cost_disclosure must be true');
    if (!contract.requires_asset_ownership_before_sale) violations.push('murabaha: requires_asset_ownership_before_sale must be true');
    if (!contract.profit_must_be_fixed_and_known) violations.push('murabaha: profit_must_be_fixed_and_known must be true');
    if (contract.possession_status !== 'in_possession') violations.push('murabaha: seller must be in possession of asset before sale');
  }
  return { valid: violations.length === 0, violations };
}

export function validateSalamContract(contract: SalamContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.buyer) violations.push('buyer is required');
  if (!contract.seller) violations.push('seller is required');
  if (!contract.commodity_type) violations.push('commodity_type is required');
  if (contract.quantity <= 0) violations.push('quantity must be positive');
  if (!contract.delivery_date) violations.push('delivery_date is required');
  if (!contract.delivery_location) violations.push('delivery_location is required');
  if (!contract.payment_completed) violations.push('salam: full payment must be completed upfront');
  if (contract.commodity_specification_is_ambiguous) violations.push('salam: commodity specification must not be ambiguous');
  return { valid: violations.length === 0, violations };
}

export function validateIstisnaContract(contract: IstisnaContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.manufacturer) violations.push('manufacturer is required');
  if (!contract.purchaser) violations.push('purchaser is required');
  if (!contract.asset_specification) violations.push('asset_specification is required');
  if (!contract.milestone_schedule || contract.milestone_schedule.length === 0) violations.push('milestone_schedule is required');
  if (!contract.delivery_requirements) violations.push('delivery_requirements is required');
  if (!contract.completion_conditions) violations.push('completion_conditions is required');
  return { valid: violations.length === 0, violations };
}

export function validatePartnershipContract(contract: PartnershipContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.partners || contract.partners.length < 2) violations.push('at least two partners are required');
  const profitTotal = Object.values(contract.profit_ratio_by_partner).reduce((s, r) => s + r, 0);
  if (Math.abs(profitTotal - 100) > 0.0001) violations.push(`profit_ratio_by_partner must sum to 100% (got ${profitTotal}%)`);
  const lossTotal = Object.values(contract.loss_ratio_by_partner).reduce((s, r) => s + r, 0);
  if (Math.abs(lossTotal - 100) > 0.0001) violations.push(`loss_ratio_by_partner must sum to 100% (got ${lossTotal}%)`);
  if (contract.guaranteed_return) violations.push('guaranteed return is prohibited in partnership contracts (riba)');
  if (!contract.liquidation_rules) violations.push('liquidation_rules is required');
  if (!contract.negligence_rules) violations.push('negligence_rules is required');
  return { valid: violations.length === 0, violations };
}

export function validateIjarahContract(contract: IjarahContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.lessor) violations.push('lessor is required');
  if (!contract.lessee) violations.push('lessee is required');
  if (!contract.leased_asset) violations.push('leased_asset is required');
  if (contract.lease_duration <= 0) violations.push('lease_duration must be positive');
  if (!contract.rent_schedule || contract.rent_schedule.length === 0) violations.push('rent_schedule is required');
  if (!contract.maintenance_obligations) violations.push('maintenance_obligations is required');
  return { valid: violations.length === 0, violations };
}

export function validateAgencyContract(contract: AgencyContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.principal) violations.push('principal is required');
  if (!contract.agent) violations.push('agent is required');
  if (!contract.authorized_scope) violations.push('authorized_scope is required');
  if (!contract.fee_structure) violations.push('fee_structure is required');
  if (!contract.reimbursement_policy) violations.push('reimbursement_policy is required');
  if (!contract.reporting_requirements) violations.push('reporting_requirements is required');
  if (!contract.revocation_rules) violations.push('revocation_rules is required');
  return { valid: violations.length === 0, violations };
}

export function validateQardContract(contract: QardContract): ValidationResult {
  const violations: string[] = [];
  if (!contract.lender) violations.push('lender is required');
  if (!contract.borrower) violations.push('borrower is required');
  if (contract.principal_amount <= 0) violations.push('principal_amount must be positive');
  if (!contract.repayment_schedule || contract.repayment_schedule.length === 0) violations.push('repayment_schedule is required');
  if (contract.guaranteed_excess) violations.push('qard: guaranteed excess is prohibited (riba)');
  if (contract.hidden_return) violations.push('qard: hidden return is prohibited (riba)');
  return { valid: violations.length === 0, violations };
}
