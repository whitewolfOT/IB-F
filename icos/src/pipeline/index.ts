import { IcosEvent } from '../events';
import { ApprovalState, SubledgerType } from '../types';
import { classify, TransactionDescriptor } from '../classification';
import { createLedgerEntry, postTransaction, LedgerEntry } from '../ledger';
import { validateSaleContract, validatePartnershipContract } from '../contracts/validators';
import { SaleContract, PartnershipContract } from '../contracts/schemas';
import { murabahaProfit, partnershipProfitAllocation } from '../formulas';

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
}

export function runPipeline(
  event: IcosEvent,
  contract: SaleContract | PartnershipContract,
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

  // Step 2: Validate contract
  let validationResult: { valid: boolean; violations: string[] };
  if (classification.contract_type === 'murabaha' || classification.contract_type === 'spot_sale') {
    validationResult = validateSaleContract(contract as SaleContract);
  } else if (classification.contract_type === 'mudaraba' || classification.contract_type === 'musharaka') {
    validationResult = validatePartnershipContract(contract as PartnershipContract);
  } else {
    validationResult = { valid: true, violations: [] };
  }
  if (!validationResult.valid) {
    throw new PipelineError(`Contract validation failed: ${validationResult.violations.join(', ')}`);
  }

  // Step 3 + 4: Compute values and post to ledger with contract-aware subledger mapping
  const ledgerEntries: LedgerEntry[] = [];
  const baseEntry = {
    originating_event_id: event.event_id,
    linked_contract_id: event.linked_contract_id,
    counterparties: event.counterparties,
    currency: 'USD',
    asset_reference: event.asset_reference,
    created_by: event.created_by,
    approval_state: ApprovalState.approved,
  };

  if (classification.contract_type === 'murabaha') {
    const sc = contract as SaleContract;
    const { profit } = murabahaProfit(sc.sale_price, sc.purchase_cost);
    ledgerEntries.push(createLedgerEntry({
      ...baseEntry,
      debit_account: SubledgerType.receivables,
      credit_account: SubledgerType.profit_distribution,
      amount: profit,
    }));
  } else if (classification.contract_type === 'mudaraba' || classification.contract_type === 'musharaka') {
    const pc = contract as PartnershipContract;
    const capitalTotal = Object.values(pc.capital_contribution_by_partner).reduce((s, v) => s + v, 0);
    ledgerEntries.push(createLedgerEntry({
      ...baseEntry,
      debit_account: SubledgerType.partnership_capital,
      credit_account: SubledgerType.receivables,
      amount: capitalTotal,
    }));
  } else if (classification.contract_type === 'ijarah') {
    ledgerEntries.push(createLedgerEntry({
      ...baseEntry,
      debit_account: SubledgerType.receivables,
      credit_account: SubledgerType.receivables,
      amount: 0,
    }));
  } else if (classification.contract_type === 'salam') {
    ledgerEntries.push(createLedgerEntry({
      ...baseEntry,
      debit_account: SubledgerType.compliance_reserve,
      credit_account: SubledgerType.receivables,
      amount: 0,
    }));
  }

  postTransaction(ledgerEntries);

  return { classification, ledgerEntries, violations: validationResult.violations };
}
