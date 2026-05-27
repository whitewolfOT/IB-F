import { IcosDb } from '../db';
import { runPipeline, AnyContract, PipelineResult } from '../pipeline';
import { TransactionDescriptor } from '../classification';
import { ApprovalState } from '../types';

export class PipelineService {
  constructor(private readonly db: IcosDb) {}

  run(eventId: string, contract: AnyContract, descriptor: TransactionDescriptor): PipelineResult {
    const stored = this.db.getEvent(eventId);
    if (!stored) throw new Error(`Event not found: ${eventId}`);
    if (stored.approval_state !== ApprovalState.approved) {
      throw new Error(`Event ${eventId} must be in 'approved' state (currently '${stored.approval_state}')`);
    }

    const event = stored as unknown as Parameters<typeof runPipeline>[0];
    const result = runPipeline(event, contract, descriptor);

    for (const entry of result.ledgerEntries) {
      this.db.insertLedgerEntry(entry);
    }

    this.db.updateContractStatus(
      event.linked_contract_id,
      'approved',
    );

    return result;
  }
}
