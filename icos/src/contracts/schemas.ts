export type PaymentScheduleEntry = { date: string; amount: number; currency: string };

export interface SaleContract {
  contract_id: string;
  contract_type: 'spot_sale' | 'murabaha' | 'deferred_payment_sale';
  seller: string;
  buyer: string;
  asset_description: string;
  quantity: number;
  unit: string;
  quality_grade: string;
  purchase_cost: number;
  sale_price: number;
  currency: string;
  delivery_date: string;
  delivery_location: string;
  payment_schedule: PaymentScheduleEntry[];
  title_transfer_rule: string;
  possession_status: 'in_possession' | 'not_in_possession';
  requires_cost_disclosure?: boolean;
  requires_asset_ownership_before_sale?: boolean;
  profit_must_be_fixed_and_known?: boolean;
}

export interface SalamContract {
  contract_id: string;
  contract_type: 'salam' | 'parallel_salam';
  buyer: string;
  seller: string;
  commodity_type: string;
  quantity: number;
  quality_specification: string;
  payment_amount: number;
  payment_timestamp: string;
  payment_completed: boolean;
  delivery_date: string;
  delivery_location: string;
  commodity_specification_is_ambiguous: boolean;
}

export interface IstisnaContract {
  contract_id: string;
  contract_type: 'istisna' | 'parallel_istisna';
  manufacturer: string;
  purchaser: string;
  asset_specification: string;
  milestone_schedule: Array<{ milestone: string; due_date: string; payment: number }>;
  delivery_requirements: string;
  payment_schedule: PaymentScheduleEntry[];
  completion_conditions: string;
}

export interface PartnershipContract {
  contract_id: string;
  contract_type: 'mudaraba' | 'musharaka';
  partners: string[];
  capital_contribution_by_partner: Record<string, number>;
  labor_contribution_by_partner: Record<string, string>;
  profit_ratio_by_partner: Record<string, number>;
  loss_ratio_by_partner: Record<string, number>;
  management_authority: Record<string, string>;
  liquidation_rules: string;
  negligence_rules: string;
  withdrawal_rules: string;
  guaranteed_return?: boolean;
}

export interface IjarahContract {
  contract_id: string;
  contract_type: 'ijarah' | 'ijarah_muntahia_bittamleek';
  lessor: string;
  lessee: string;
  leased_asset: string;
  lease_duration: number;
  rent_schedule: PaymentScheduleEntry[];
  maintenance_obligations: string;
  ownership_transfer_conditions?: string;
}

export interface AgencyContract {
  contract_id: string;
  contract_type: 'wakala' | 'wakala_bi_al_istithmar';
  principal: string;
  agent: string;
  authorized_scope: string;
  fee_structure: string;
  reimbursement_policy: string;
  reporting_requirements: string;
  revocation_rules: string;
}

export interface QardContract {
  contract_id: string;
  contract_type: 'qard';
  lender: string;
  borrower: string;
  principal_amount: number;
  repayment_schedule: PaymentScheduleEntry[];
  collateral_if_any?: string;
  guaranteed_excess?: boolean;
  hidden_return?: boolean;
}
