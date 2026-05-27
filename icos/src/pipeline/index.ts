import { IcosEvent } from '../events';
import { ApprovalState, SubledgerType } from '../types';
import { classify, TransactionDescriptor } from '../classification';
import { createLedgerEntry, postTransaction, LedgerEntry } from '../ledger';
import {
  validateSaleContract,
  validateSalamContract,
  validateIstisnaContract,
  validatePartnershipContract,
  validateIjarahContract,
  validateAgencyContract,
  validateQardContract,
  validateProhibitedIndustry,
} from '../contracts/validators';
import {
  SaleContract,
  SalamContract,
  IstisnaContract,
  PartnershipContract,
  IjarahContract,
  AgencyContract,
  QardContract,
} from '../contracts/schemas';
import { murabahaProfit, leaseRevenue } from '../formulas';
import { createShariahReviewStub, ShariahReviewRecord } from '../shariah';
import { detectFromContract } from '../validation';
import { scoreCompliance, ComplianceScore } from '../compliance';

export type AnyContract =
  | SaleContract
  | SalamContract
  | IstisnaContract
  | PartnershipContract
  | IjarahContract
  | AgencyContract
  | QardContract;

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineError';
  }
}

export interface PipelineResult {
  classification: ReturnType<typeof classify>;
  ledgerEntries: LedgerEntry[];
  violations: string[];
  shariahReviewStub: ShariahReviewRecord | null;
  complianceScore: ComplianceScore;
  ribaViolations: string[];
  ghararViolations: string[];
  maysirViolations: string[];
  leaseRevenueMetrics?: { earnedRevenue: number; unearnedLiability: number };
}

function baseEntryFields(event: IcosEvent) {
  return {
    originating_event_id: event.event_id,
    linked_contract_id: event.linked_contract_id,
    counterparties: event.counterparties,
    currency: 'USD',
    asset_reference: event.asset_reference,
    created_by: event.created_by,
    approval_state: ApprovalState.approved,
  };
}

export function runPipeline(
  event: IcosEvent,
  contract: AnyContract,
  descriptor: TransactionDescriptor,
): PipelineResult {
  if (event.approval_state !== ApprovalState.approved) {
    throw new PipelineError(`Event must be in 'approved' state, got '${event.approval_state}'`);
  }

  // Step 1: Classify
  const classification = classify(descriptor);
  if (classification.violations.length > 0) {
    throw new PipelineError(`Classification violations: ${classification.violations.join(', ')}`);
  }

  // Step 1.5: Compliance scoring gate (spec §12) — runs before contract validation
  const { ribaViolations, ghararViolations, maysirViolations } = detectFromContract(
    contract as Parameters<typeof detectFromContract>[0],
  );
  const complianceScore = scoreCompliance({
    noRiba: ribaViolations.length === 0,
    noGharar: ghararViolations.length === 0,
    assetBacked: Boolean(event.asset_reference),
    ownershipValid:
      classification.contract_type !== 'murabaha' ||
      (contract as SaleContract).possession_status === 'in_possession',
    properRiskSharing:
      !['mudaraba', 'musharaka'].includes(classification.contract_type) ||
      !(contract as PartnershipContract).guaranteed_return,
  });
  if (complianceScore.score < 40) {
    throw new PipelineError(
      `Compliance score ${complianceScore.score} is Non-Compliant: ${complianceScore.band}. ` +
      `Riba: [${ribaViolations.join('; ')}]; ` +
      `Gharar: [${ghararViolations.join('; ')}]; ` +
      `Maysir: [${maysirViolations.join('; ')}]`,
    );
  }

  // Step 1.6: Prohibited industry check (spec §11A / §6 taxonomy)
  const ct = classification.contract_type;
  let industryDesc: string | undefined;
  if (ct === 'murabaha' || ct === 'spot_sale' || ct === 'deferred_payment_sale') {
    industryDesc = (contract as SaleContract).asset_description;
  } else if (ct === 'salam' || ct === 'parallel_salam') {
    industryDesc = (contract as SalamContract).commodity_type;
  } else if (ct === 'istisna' || ct === 'parallel_istisna') {
    industryDesc = (contract as IstisnaContract).asset_specification;
  } else if (ct === 'ijarah' || ct === 'ijarah_muntahia_bittamleek') {
    industryDesc = (contract as IjarahContract).leased_asset;
  } else if (ct === 'wakala' || ct === 'wakala_bi_al_istithmar') {
    industryDesc = (contract as AgencyContract).authorized_scope;
  }
  if (industryDesc) {
    const industryCheck = validateProhibitedIndustry(industryDesc);
    if (!industryCheck.valid) {
      throw new PipelineError(`Prohibited industry: ${industryCheck.violations.join('; ')}`);
    }
  }

  // Step 2: Validate contract and produce ledger entries
  const base = baseEntryFields(event);
  const ledgerEntries: LedgerEntry[] = [];
  let violations: string[] = [];
  let ijarahLeaseMetrics: { earnedRevenue: number; unearnedLiability: number } | undefined;

  switch (classification.contract_type) {
    case 'murabaha':
    case 'spot_sale':
    case 'deferred_payment_sale': {
      const sc = contract as SaleContract;
      const result = validateSaleContract(sc);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      const { profit } = murabahaProfit(sc.sale_price, sc.purchase_cost);
      // Record full receivable (sale_price) against inventory cost + profit
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.receivables,
        credit_account: SubledgerType.inventory,
        amount: sc.purchase_cost,
      }));
      if (profit > 0) {
        ledgerEntries.push(createLedgerEntry({
          ...base,
          debit_account: SubledgerType.receivables,
          credit_account: SubledgerType.profit_distribution,
          amount: profit,
        }));
      }
      break;
    }

    case 'salam':
    case 'parallel_salam': {
      const sc = contract as SalamContract;
      const result = validateSalamContract(sc);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      // Advance payment: cash out → forward delivery obligation in
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.compliance_reserve,   // future goods receivable
        credit_account: SubledgerType.payables,            // cash paid to seller
        amount: sc.payment_amount,
      }));
      break;
    }

    case 'istisna':
    case 'parallel_istisna': {
      const ic = contract as IstisnaContract;
      const result = validateIstisnaContract(ic);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      const firstPayment = ic.payment_schedule[0]?.amount ?? ic.milestone_schedule[0]?.payment ?? 0;
      if (firstPayment <= 0) throw new PipelineError('istisna: first milestone payment must be positive');
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.inventory,   // work in progress asset
        credit_account: SubledgerType.payables,   // obligation to manufacturer
        amount: firstPayment,
      }));
      break;
    }

    case 'mudaraba':
    case 'musharaka': {
      const pc = contract as PartnershipContract;
      const result = validatePartnershipContract(pc);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      const capitalTotal = Object.values(pc.capital_contribution_by_partner).reduce((s, v) => s + v, 0);
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.partnership_capital,  // capital received
        credit_account: SubledgerType.receivables,         // partner's contributed amount
        amount: capitalTotal,
      }));
      break;
    }

    case 'ijarah':
    case 'ijarah_muntahia_bittamleek': {
      const ic = contract as IjarahContract;
      const result = validateIjarahContract(ic);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      const firstRent = ic.rent_schedule[0]?.amount ?? 0;
      if (firstRent <= 0) throw new PipelineError('ijarah: first rent payment must be positive');
      // Compute earned vs unearned lease revenue (§9F) for the first rental period
      const leaseMetrics = leaseRevenue(firstRent, 1, firstRent);
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.receivables,          // rent receivable from lessee
        credit_account: SubledgerType.profit_distribution, // lease income (usufruct transferred)
        amount: firstRent,
      }));
      ijarahLeaseMetrics = leaseMetrics;
      break;
    }

    case 'wakala':
    case 'wakala_bi_al_istithmar': {
      const ac = contract as AgencyContract;
      const result = validateAgencyContract(ac);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      // Agency fee receivable from principal
      // fee_structure is a description string; extract numeric amount from event quantity × unit price
      const agencyFee = event.quantity;
      if (agencyFee <= 0) throw new PipelineError('wakala: event quantity must represent the agency fee amount');
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.receivables,   // fee receivable from principal
        credit_account: SubledgerType.agency_fee,   // agency fee income
        amount: agencyFee,
      }));
      break;
    }

    case 'qard': {
      const qc = contract as QardContract;
      const result = validateQardContract(qc);
      violations = result.violations;
      if (!result.valid) throw new PipelineError(`Contract validation failed: ${violations.join(', ')}`);
      // Loan extended: receivable increases, payables decrease (cash out)
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.receivables, // loan receivable from borrower
        credit_account: SubledgerType.payables,   // cash disbursed
        amount: qc.principal_amount,
      }));
      break;
    }

    default:
      throw new PipelineError(`Unhandled contract type: ${classification.contract_type}`);
  }

  postTransaction(ledgerEntries);

  // Spec §12A: auto-trigger Shariah review stub when risk_flags detected
  const shariahReviewStub: ShariahReviewRecord | null =
    classification.risk_flags.length > 0
      ? createShariahReviewStub(
          event.linked_contract_id,
          `Classifier detected risk flags: ${classification.risk_flags.join(', ')}`,
        )
      : null;

  return { classification, ledgerEntries, violations, shariahReviewStub, complianceScore, ribaViolations, ghararViolations, maysirViolations, leaseRevenueMetrics: ijarahLeaseMetrics };
}
