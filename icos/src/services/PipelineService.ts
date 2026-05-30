import { IIcosDb } from '../db/interface';
import { runPipeline, AnyContract, PipelineResult } from '../pipeline';
import { TransactionDescriptor } from '../classification';
import { ApprovalState } from '../types';
import { ConfigService } from '../config';

export class PipelineService {
  constructor(
    private readonly db: IIcosDb,
    private readonly config?: ConfigService,
  ) {}

  run(eventId: string, contract: AnyContract, descriptor: TransactionDescriptor): PipelineResult {
    const stored = this.db.getEvent(eventId);
    if (!stored) throw new Error(`Event not found: ${eventId}`);
    if (stored.approval_state !== ApprovalState.approved) {
      throw new Error(`Event ${eventId} must be in 'approved' state (currently '${stored.approval_state}')`);
    }

    const event = stored as unknown as Parameters<typeof runPipeline>[0];
    const result = runPipeline(event, contract, descriptor, this.config ? {
      operationalWeights: this.config.getOperationalWeights(),
    } : undefined);

    for (const entry of result.ledgerEntries) {
      this.db.insertLedgerEntry(entry);
    }

    // Persist Shariah review stub when classifier detected risk flags (spec §12A)
    if (result.shariahReviewStub) {
      const stub = result.shariahReviewStub;
      this.db.insertShariahReview({
        review_id: stub.review_id,
        related_contract_id: stub.related_contract_id,
        reviewer_id: stub.reviewer_id,
        triggering_reason: stub.triggering_reason,
        legal_reasoning: stub.legal_reasoning,
        ruling_type: stub.ruling?.ruling_type ?? null,
        ruling_confidence: stub.ruling_confidence,
        freeze_settlement: stub.freeze_settlement,
        block_profit_distribution: stub.block_profit_distribution,
        escalation_status: stub.escalation_status,
        digital_signature: stub.digital_signature,
        timestamp: stub.timestamp,
      });
    }

    this.db.updateContractStatus(event.linked_contract_id, 'approved');

    return result;
  }
}
