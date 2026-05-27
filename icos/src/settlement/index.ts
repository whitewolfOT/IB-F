import { v4 as uuidv4 } from 'uuid';
import { IcosEvent } from '../events';
import { ApprovalState, SubledgerType } from '../types';
import { LedgerEntry, createLedgerEntry, postTransaction } from '../ledger';
import { PartnershipContract } from '../contracts/schemas';
import { ShariahReviewRecord, RulingState, SettlementFrozenError } from '../shariah';
import { partnershipProfitAllocation, netRealProfit } from '../formulas';

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettlementError';
  }
}

export interface SettlementAuditRecord {
  settlement_id: string;
  timestamp: string;
  event_id: string;
  contract_id: string;
  realized_profit: number;
  net_real_profit: number;
  distributions: Record<string, number>;
  ledger_entries: LedgerEntry[];
  final_state: ApprovalState;
}

export function settle(
  event: IcosEvent,
  contract: PartnershipContract,
  realizedProfit: number,
  shariahRecord?: ShariahReviewRecord,
  operationalCosts = 0,
  assetLosses = 0,
  settlementLosses = 0,
): SettlementAuditRecord {
  if (shariahRecord?.freeze_settlement) {
    throw new SettlementFrozenError('Settlement is frozen due to Shariah non-compliance ruling');
  }
  if (shariahRecord?.ruling?.ruling_type === RulingState.non_compliant) {
    throw new SettlementFrozenError('Settlement blocked: contract is Shariah non-compliant');
  }
  if (event.approval_state !== ApprovalState.approved) {
    throw new SettlementError(`Event must be in 'approved' state, got '${event.approval_state}'`);
  }

  // §9I: net real economic profit — only realized productive profit is distributable
  const calculatedNetRealProfit = netRealProfit(realizedProfit, operationalCosts, assetLosses, settlementLosses);
  const distributableProfit = Math.max(0, calculatedNetRealProfit);

  // Compute partner distributions using formula
  const profitRatios = Object.fromEntries(
    Object.entries(contract.profit_ratio_by_partner).map(([k, v]) => [k, v / 100])
  );
  const distributions = partnershipProfitAllocation(distributableProfit, profitRatios);

  const ledgerEntries: LedgerEntry[] = [];
  const base = {
    originating_event_id: event.event_id,
    linked_contract_id: event.linked_contract_id,
    counterparties: event.counterparties,
    currency: 'USD',
    asset_reference: event.asset_reference,
    created_by: event.created_by,
    approval_state: ApprovalState.approved,
  };

  for (const [, amount] of Object.entries(distributions)) {
    if (amount > 0) {
      ledgerEntries.push(createLedgerEntry({
        ...base,
        debit_account: SubledgerType.profit_distribution,
        credit_account: SubledgerType.payables,
        amount,
      }));
    }
  }
  if (ledgerEntries.length > 0) postTransaction(ledgerEntries);

  (event as { approval_state: ApprovalState }).approval_state = ApprovalState.settled;

  return {
    settlement_id: uuidv4(),
    timestamp: new Date().toISOString(),
    event_id: event.event_id,
    contract_id: event.linked_contract_id,
    realized_profit: realizedProfit,
    net_real_profit: calculatedNetRealProfit,
    distributions,
    ledger_entries: ledgerEntries,
    final_state: ApprovalState.settled,
  };
}
