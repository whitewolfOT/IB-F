import { IcosDb } from '../db';
import {
  ShariahReviewRecord,
  RulingInput,
  updateShariahRuling,
  ComplianceFlag,
  ShariahOverrideEvent,
  createOverride,
} from '../shariah';

export class ShariahService {
  constructor(private readonly db: IcosDb) {}

  applyRuling(reviewId: string, input: RulingInput): {
    review_id: string;
    ruling_type: string;
    freeze_settlement: boolean;
    block_profit_distribution: boolean;
    compliance_flag: ComplianceFlag | null;
  } {
    const row = this.db.getShariahReview(reviewId);
    if (!row) throw new Error(`Review not found: ${reviewId}`);

    const record: ShariahReviewRecord = {
      review_id: String(row.review_id),
      timestamp: String(row.timestamp),
      related_contract_id: String(row.related_contract_id),
      related_event_ids: [],
      reviewer_id: String(row.reviewer_id),
      triggering_reason: String(row.triggering_reason),
      submitted_documents: [],
      detected_issues: [],
      evidentiary_basis: [],
      legal_reasoning: String(row.legal_reasoning ?? ''),
      ruling: null,
      ruling_confidence: Number(row.ruling_confidence ?? 0),
      required_remediation: [],
      followup_requirements: [],
      escalation_status: String(row.escalation_status ?? 'pending'),
      digital_signature: String(row.digital_signature ?? ''),
      freeze_settlement: row.freeze_settlement === 1,
      block_profit_distribution: row.block_profit_distribution === 1,
    };

    const complianceFlag = updateShariahRuling(record, input);

    this.db.updateShariahReviewRuling(reviewId, {
      ruling_type: input.ruling_type,
      legal_reasoning: input.legal_reasoning,
      ruling_confidence: input.ruling_confidence,
      freeze_settlement: record.freeze_settlement,
      block_profit_distribution: record.block_profit_distribution,
      digital_signature: record.digital_signature,
      ruling_json: JSON.stringify(record.ruling),
    });

    return {
      review_id: reviewId,
      ruling_type: input.ruling_type,
      freeze_settlement: record.freeze_settlement,
      block_profit_distribution: record.block_profit_distribution,
      compliance_flag: complianceFlag,
    };
  }

  applyOverride(reviewId: string, params: Omit<ShariahOverrideEvent, 'override_id' | 'timestamp'>): ShariahOverrideEvent {
    const row = this.db.getShariahReview(reviewId);
    if (!row) throw new Error(`Review not found: ${reviewId}`);

    const override = createOverride(params);

    this.db.insertShariahOverride({
      override_id: override.override_id,
      overridden_ruling_id: reviewId,
      authorizing_entities: override.authorizing_entities,
      justification: override.justification,
      risk_acknowledgment: override.risk_acknowledgment,
      expiration_conditions: override.expiration_conditions,
      timestamp: override.timestamp,
    });

    return override;
  }
}
