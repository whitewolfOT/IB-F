import { IcosDb } from '../db';
import { settle, SettlementAuditRecord, SettlementError } from '../settlement';
import { PartnershipContract } from '../contracts/schemas';
import { ShariahReviewRecord } from '../shariah';
import { ApprovalState } from '../types';

export class SettlementService {
  constructor(private readonly db: IcosDb) {}

  settle(
    eventId: string,
    contract: PartnershipContract,
    realizedProfit: number,
    shariahRecord?: ShariahReviewRecord,
  ): SettlementAuditRecord {
    const stored = this.db.getEvent(eventId);
    if (!stored) throw new Error(`Event not found: ${eventId}`);

    const auditTrail = this.db.getAuditTrail(eventId);
    const hasComplianceStage = auditTrail.some(
      e => e.new_state === ApprovalState.compliance_review || e.new_state === ApprovalState.shariah_review,
    );
    if (!hasComplianceStage) {
      throw new SettlementError(
        `Event ${eventId} has not completed compliance_review. Settlement requires full approval chain.`,
      );
    }

    const event = stored as unknown as Parameters<typeof settle>[0];
    const record = settle(event, contract, realizedProfit, shariahRecord);

    for (const entry of record.ledger_entries) {
      this.db.insertLedgerEntry(entry);
    }

    this.db.updateEventState(eventId, ApprovalState.settled);
    this.db.updateContractStatus(event.linked_contract_id, 'settled');

    return record;
  }
}
