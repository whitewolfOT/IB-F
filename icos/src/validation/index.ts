import {
  SaleContract,
  SalamContract,
  IstisnaContract,
  PartnershipContract,
  IjarahContract,
  AgencyContract,
  QardContract,
} from '../contracts/schemas';

export type AnyContractForValidation =
  | SaleContract
  | SalamContract
  | IstisnaContract
  | PartnershipContract
  | IjarahContract
  | AgencyContract
  | QardContract;

export interface RibaInput {
  guaranteed_return?: boolean;
  has_interest_clause?: boolean;
  debt_increases_over_time?: boolean;
  currency_exchange_mismatch?: boolean;
  penalty_profit_clause?: boolean;
}

export interface GhararInput {
  asset_defined: boolean;
  delivery_date_specified: boolean;
  delivery_location_specified: boolean;
  ownership_clear: boolean;
  price_defined: boolean;
  key_terms_present: boolean;
}

export interface MaysirInput {
  zero_sum_structure?: boolean;
  outcome_depends_on_chance?: boolean;
  no_underlying_real_asset?: boolean;
}

export interface ValidationReport {
  ribaViolations: string[];
  ghararViolations: string[];
  maysirViolations: string[];
}

export function detectRiba(input: RibaInput): string[] {
  const violations: string[] = [];
  if (input.guaranteed_return) violations.push('Riba detected: guaranteed return in partnership is prohibited');
  if (input.has_interest_clause) violations.push('Riba detected: has_interest_clause — loan with mandatory increase is prohibited');
  if (input.debt_increases_over_time) violations.push('Riba detected: debt_increases_over_time — compounding debt (riba al-nasia) is prohibited');
  if (input.currency_exchange_mismatch) violations.push('Riba detected: currency_exchange_mismatch — unequal money-for-money exchange (riba al-fadl) is prohibited');
  if (input.penalty_profit_clause) violations.push('Riba detected: penalty_profit_clause — creditor profiting from late fees is prohibited');
  return violations;
}

export function detectGharar(input: GhararInput): string[] {
  const violations: string[] = [];
  if (!input.asset_defined) violations.push('Gharar detected: asset is not defined or specified');
  if (!input.delivery_date_specified) violations.push('Gharar detected: delivery date not specified');
  if (!input.delivery_location_specified) violations.push('Gharar detected: delivery location not specified');
  if (!input.ownership_clear) violations.push('Gharar detected: ownership or possession not clearly established');
  if (!input.price_defined) violations.push('Gharar detected: price not defined or fixed');
  if (!input.key_terms_present) violations.push('Gharar detected: critical contract terms are absent or ambiguous');
  return violations;
}

export function detectMaysir(input: MaysirInput): string[] {
  const violations: string[] = [];
  if (input.zero_sum_structure) violations.push('Maysir detected: zero-sum structure (pure betting exposure) is prohibited');
  if (input.outcome_depends_on_chance) violations.push('Maysir detected: outcome_depends_on_chance — luck-based payout is prohibited');
  if (input.no_underlying_real_asset) violations.push('Maysir detected: no_underlying_real_asset — synthetic leverage without real asset is prohibited');
  return violations;
}

export function detectFromContract(contract: AnyContractForValidation): ValidationReport {
  let ribaInput: RibaInput = {};
  let ghararInput: GhararInput = {
    asset_defined: true,
    delivery_date_specified: true,
    delivery_location_specified: true,
    ownership_clear: true,
    price_defined: true,
    key_terms_present: true,
  };
  const maysirInput: MaysirInput = {};

  const ct = contract.contract_type;

  if (ct === 'murabaha' || ct === 'spot_sale' || ct === 'deferred_payment_sale') {
    const sc = contract as SaleContract;
    ghararInput = {
      asset_defined: Boolean(sc.asset_description),
      delivery_date_specified: Boolean(sc.delivery_date),
      delivery_location_specified: Boolean(sc.delivery_location),
      ownership_clear: sc.possession_status === 'in_possession',
      price_defined: sc.sale_price > 0,
      key_terms_present: Boolean(sc.title_transfer_rule),
    };
  } else if (ct === 'salam' || ct === 'parallel_salam') {
    const sc = contract as SalamContract;
    ghararInput = {
      asset_defined: Boolean(sc.commodity_type) && Boolean(sc.quality_specification),
      delivery_date_specified: Boolean(sc.delivery_date),
      delivery_location_specified: Boolean(sc.delivery_location),
      ownership_clear: Boolean(sc.seller),
      price_defined: sc.payment_amount > 0,
      key_terms_present: !sc.commodity_specification_is_ambiguous,
    };
  } else if (ct === 'istisna' || ct === 'parallel_istisna') {
    const ic = contract as IstisnaContract;
    ghararInput = {
      asset_defined: Boolean(ic.asset_specification),
      delivery_date_specified: (ic.milestone_schedule?.length ?? 0) > 0,
      delivery_location_specified: Boolean(ic.delivery_requirements),
      ownership_clear: Boolean(ic.manufacturer),
      price_defined: (ic.milestone_schedule?.length ?? 0) > 0,
      key_terms_present: Boolean(ic.completion_conditions),
    };
  } else if (ct === 'mudaraba' || ct === 'musharaka') {
    const pc = contract as PartnershipContract;
    ribaInput = { guaranteed_return: pc.guaranteed_return };
    ghararInput = {
      asset_defined: Object.keys(pc.capital_contribution_by_partner).length > 0,
      delivery_date_specified: true,
      delivery_location_specified: true,
      ownership_clear: pc.partners.length >= 2,
      price_defined: Object.keys(pc.profit_ratio_by_partner).length > 0,
      key_terms_present: Boolean(pc.liquidation_rules) && Boolean(pc.negligence_rules),
    };
  } else if (ct === 'ijarah' || ct === 'ijarah_muntahia_bittamleek') {
    const ic = contract as IjarahContract;
    ghararInput = {
      asset_defined: Boolean(ic.leased_asset),
      delivery_date_specified: true,
      delivery_location_specified: true,
      ownership_clear: Boolean(ic.lessor),
      price_defined: (ic.rent_schedule?.length ?? 0) > 0,
      key_terms_present: Boolean(ic.maintenance_obligations) && ic.lease_duration > 0,
    };
  } else if (ct === 'wakala' || ct === 'wakala_bi_al_istithmar') {
    const ac = contract as AgencyContract;
    ghararInput = {
      asset_defined: Boolean(ac.authorized_scope),
      delivery_date_specified: true,
      delivery_location_specified: true,
      ownership_clear: Boolean(ac.principal) && Boolean(ac.agent),
      price_defined: Boolean(ac.fee_structure),
      key_terms_present: Boolean(ac.revocation_rules) && Boolean(ac.reimbursement_policy),
    };
  } else if (ct === 'qard') {
    const qc = contract as QardContract;
    ribaInput = {
      guaranteed_return: qc.guaranteed_excess,
      has_interest_clause: qc.guaranteed_excess || qc.hidden_return,
    };
    ghararInput = {
      asset_defined: qc.principal_amount > 0,
      delivery_date_specified: (qc.repayment_schedule?.length ?? 0) > 0,
      delivery_location_specified: true,
      ownership_clear: Boolean(qc.lender) && Boolean(qc.borrower),
      price_defined: true,
      key_terms_present: (qc.repayment_schedule?.length ?? 0) > 0,
    };
  }

  return {
    ribaViolations: detectRiba(ribaInput),
    ghararViolations: detectGharar(ghararInput),
    maysirViolations: detectMaysir(maysirInput),
  };
}
