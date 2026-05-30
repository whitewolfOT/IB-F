export const SubledgerType = {
  inventory: 'inventory',
  receivables: 'receivables',
  payables: 'payables',
  partnership_capital: 'partnership_capital',
  profit_distribution: 'profit_distribution',
  zakat: 'zakat',
  waqf: 'waqf',
  agency_fee: 'agency_fee',
  compliance_reserve: 'compliance_reserve',
} as const;
export type SubledgerType = (typeof SubledgerType)[keyof typeof SubledgerType];

export const ApprovalState = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'under_review',
  operationally_verified: 'operationally_verified',
  financially_verified: 'financially_verified',
  compliance_review: 'compliance_review',
  shariah_review: 'shariah_review',
  approved: 'approved',
  rejected: 'rejected',
  returned_for_revision: 'returned_for_revision',
  suspended: 'suspended',
  settled: 'settled',
  archived: 'archived',
} as const;
export type ApprovalState = (typeof ApprovalState)[keyof typeof ApprovalState];

export const OrgRole = {
  operator: 'operator',
  warehouse_manager: 'warehouse_manager',
  procurement_officer: 'procurement_officer',
  financial_controller: 'financial_controller',
  risk_officer: 'risk_officer',
  compliance_officer: 'compliance_officer',
  shariah_reviewer: 'shariah_reviewer',
  senior_shariah_board: 'senior_shariah_board',
  auditor: 'auditor',
  settlement_officer: 'settlement_officer',
  counterparty: 'counterparty',
  client: 'client',
  system: 'system',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const ContractType = {
  spot_sale: 'spot_sale',
  murabaha: 'murabaha',
  deferred_payment_sale: 'deferred_payment_sale',
  salam: 'salam',
  parallel_salam: 'parallel_salam',
  istisna: 'istisna',
  parallel_istisna: 'parallel_istisna',
  mudaraba: 'mudaraba',
  musharaka: 'musharaka',
  ijarah: 'ijarah',
  ijarah_muntahia_bittamleek: 'ijarah_muntahia_bittamleek',
  wakala: 'wakala',
  wakala_bi_al_istithmar: 'wakala_bi_al_istithmar',
  qard: 'qard',
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];
