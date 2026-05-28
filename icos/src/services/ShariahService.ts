import { v4 as uuidv4 } from 'uuid';
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

  getReviewRecord(reviewId: string): Record<string, unknown> | undefined {
    return this.db.getShariahReview(reviewId);
  }

  saveDraft(reviewId: string, draftReasoning: string): string {
    this.db.saveDraftRuling(reviewId, draftReasoning);
    return new Date().toISOString();
  }

  confirmReview(reviewId: string): void {
    this.db.updateShariahReviewEscalation(reviewId, 'confirmed_by_board');
  }

  applyRuling(reviewId: string, input: RulingInput): {
    review_id: string;
    ruling_type: string;
    freeze_settlement: boolean;
    block_profit_distribution: boolean;
    compliance_flag: ComplianceFlag | null;
    reviewer_expiry_flag?: boolean;
  } {
    const row = this.db.getShariahReview(reviewId);
    if (!row) throw new Error(`Review not found: ${reviewId}`);

    // Step 15: Check reviewer appointment expiry
    let reviewerExpiryFlag = false;
    const reviewerProfile = this.db.getShariahReviewerByUserId(String(row.reviewer_id));
    if (reviewerProfile) {
      const assignedAt = String(row.timestamp);
      const now = new Date().toISOString();
      const expiry = reviewerProfile.appointment_period_end;
      const startExpiry = reviewerProfile.appointment_period_start;

      if (assignedAt < startExpiry || assignedAt > expiry) {
        // Reviewer was already expired at assignment time — reject
        throw new Error(`Reviewer appointment was not active at assignment time (appointment: ${startExpiry} to ${expiry})`);
      }
      if (now > expiry) {
        // Expired since assignment — accept but flag
        reviewerExpiryFlag = true;
        this.db.updateShariahReviewEscalation(reviewId, 'requires_board_confirmation');
      }
    }

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

    // Insert a compliance flag if reviewer's appointment expired between assignment and signing
    let finalFlag: ComplianceFlag | null = complianceFlag;
    if (reviewerExpiryFlag) {
      const expiryFlag: ComplianceFlag = {
        flag_id: uuidv4(),
        contract_id: String(row.related_contract_id),
        violation_type: 'reviewer_appointment_expired',
        severity: 'high',
        notes: `Reviewer appointment expired before signing. Board confirmation required.`,
        created_at: new Date().toISOString(),
      };
      this.db.insertComplianceFlag(expiryFlag);
      finalFlag = finalFlag ?? expiryFlag;
    }

    return {
      review_id: reviewId,
      ruling_type: input.ruling_type,
      freeze_settlement: record.freeze_settlement,
      block_profit_distribution: record.block_profit_distribution,
      compliance_flag: finalFlag,
      reviewer_expiry_flag: reviewerExpiryFlag || undefined,
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
