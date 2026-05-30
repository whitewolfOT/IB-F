/**
 * IIcosDb — abstract interface for the ICOS database layer.
 * Import this in services and routes instead of the concrete IcosDb class.
 * Only app.ts and server.ts should import IcosDb directly.
 *
 * All shared DB types are defined here; index.ts re-exports them so existing
 * import sites do not need to change.
 */

import { LedgerEntry } from '../ledger';
import { IcosEvent } from '../events';
import { ApprovalAuditEvent } from '../approval';
import { ComplianceFlag } from '../shariah';

// ── Shared DB type definitions ────────────────────────────────────────────────

export interface DbUser {
  user_id: string;
  email: string;
  password_hash: string;
  role: string;
  party_id: string | null;
  is_master: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  session_id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

export interface DbConfigEntry {
  config_key: string;
  config_value: string;
  value_type: 'number' | 'string' | 'json' | 'array';
  description: string;
  updated_at: string;
  updated_by: string;
}

export interface DbConfigProposal {
  proposal_id: string;
  config_key: string;
  current_value: string;
  proposed_value: string;
  proposed_by: string;
  proposed_at: string;
  status: 'pending' | 'ratified' | 'rejected';
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
}

export interface DbException {
  exception_id: string;
  exception_type: 'compliance_exception' | 'shariah_override_request' | 'prohibited_industry_dispute';
  event_id: string;
  submitter_id: string;
  grounds: string;
  scope: 'this_event' | 'this_contract_type' | 'this_counterparty';
  disputed_criterion: string | null;
  disputed_match: string | null;
  supporting_docs: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface DbExceptionDecision {
  decision_id: string;
  exception_id: string;
  decided_by: string;
  decision: 'approved' | 'rejected';
  notes: string;
  decided_at: string;
  step: number;
  total_steps_required: number;
}

export interface DbUploadRecord {
  file_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface DbAccessLog {
  log_id: string;
  user_id: string;
  action: 'read_ruling' | 'read_legal_reasoning' | 'read_audit_trail' | 'read_override' | 'read_compliance_flag' | 'export_pdf';
  resource_type: string;
  resource_id: string;
  ip_address: string | null;
  user_agent: string | null;
  accessed_at: string;
}

export interface DbStandard {
  standard_id: string;
  code: string;
  title: string;
  summary: string;
  active: boolean;
  created_at: string;
}

export interface DbShariahReviewer {
  reviewer_id: string;
  user_id: string;
  full_name: string;
  credentials: string;
  madhhab: 'Hanafi' | 'Maliki' | 'Shafii' | 'Hanbali' | 'Jafari' | 'Other';
  jurisdiction: string;
  appointment_period_start: string;
  appointment_period_end: string;
  active: boolean;
  created_at: string;
}

export interface DbParty {
  party_id: string;
  name: string;
  role: string;
  country: string;
  verification_status: boolean;
}

export interface DbAsset {
  asset_id: string;
  asset_type: string;
  ownership_status: 'owned' | 'leased' | 'pledged' | 'disputed' | 'transferred';
  valuation: number;
  description: string;
}

export interface DbContract {
  contract_id: string;
  contract_type: string;
  status: string;
  shariah_score: number | null;
  created_at: string;
  updated_at: string;
}

// ── IIcosDb interface ─────────────────────────────────────────────────────────

export interface IIcosDb {
  close(): void;

  // Parties
  upsertParty(party: DbParty): void;
  getParty(partyId: string): DbParty | undefined;
  listParties(): DbParty[];

  // Assets
  upsertAsset(asset: DbAsset): void;
  getAsset(assetId: string): DbAsset | undefined;
  listAssets(): DbAsset[];

  // Contracts
  insertContract(contract: DbContract): void;
  updateContractStatus(contractId: string, status: string, shariahScore?: number): void;
  getContract(contractId: string): DbContract | undefined;
  listContracts(status?: string): DbContract[];

  // Events
  insertEvent(event: IcosEvent): void;
  updateEventState(eventId: string, approvalState: string): void;
  getEvent(eventId: string): (Omit<IcosEvent, 'counterparties'> & { counterparties: string[] }) | undefined;
  listEvents(linkedContractId?: string, createdBy?: string): Record<string, unknown>[];

  // Ledger Entries
  insertLedgerEntry(entry: LedgerEntry): void;
  finalizeLedgerEntry(entryId: string): void;
  attemptLedgerUpdate(entryId: string, amount: number): void;
  getLedgerEntriesForContract(contractId: string): LedgerEntry[];
  listAllLedgerEntries(filters?: {
    subledger_type?: string;
    since?: string;
    until?: string;
    contract_id?: string;
    event_id?: string;
  }): LedgerEntry[];
  getLedgerSummary(since?: string, until?: string): {
    total_debits: number;
    total_credits: number;
    entry_count: number;
    balanced: boolean;
    imbalance: number;
  };

  // Approval Audit Trail
  insertApprovalAuditEvent(auditEvent: ApprovalAuditEvent): void;
  getAuditTrail(objectId: string): ApprovalAuditEvent[];

  // Compliance Flags
  insertComplianceFlag(flag: ComplianceFlag): void;
  getComplianceFlagsForContract(contractId: string): ComplianceFlag[];

  // Shariah Review Records
  insertShariahReview(record: {
    review_id: string;
    related_contract_id: string;
    reviewer_id: string;
    triggering_reason: string;
    legal_reasoning: string;
    ruling_type: string | null;
    ruling_confidence: number;
    freeze_settlement: boolean;
    block_profit_distribution: boolean;
    escalation_status: string;
    digital_signature: string;
    timestamp: string;
  }): void;
  getShariahReviewsForContract(contractId: string): unknown[];
  getShariahReview(reviewId: string): Record<string, unknown> | undefined;
  insertShariahOverride(override: {
    override_id: string;
    overridden_ruling_id: string;
    authorizing_entities: string[];
    justification: string;
    risk_acknowledgment: string;
    expiration_conditions: string;
    timestamp: string;
  }): void;
  getShariahOverridesForReview(reviewId: string): unknown[];
  updateShariahReviewRuling(reviewId: string, params: {
    ruling_type: string;
    legal_reasoning: string;
    ruling_confidence: number;
    freeze_settlement: boolean;
    block_profit_distribution: boolean;
    digital_signature: string;
    ruling_json: string;
  }): void;

  // Supporting Instruments
  insertInstrument(instrument: { instrument_id: string; instrument_type: string; linked_contract_id: string; data_json: string; created_at: string }): void;
  getInstrument(instrumentId: string): Record<string, unknown> | undefined;
  listInstrumentsForContract(contractId: string): Record<string, unknown>[];

  // Users
  insertUser(user: DbUser): void;
  getUserByEmail(email: string): DbUser | undefined;
  getUserById(userId: string): DbUser | undefined;
  listUsers(): DbUser[];
  updateUser(userId: string, updates: Partial<Pick<DbUser, 'role' | 'active' | 'party_id' | 'updated_at' | 'email' | 'password_hash'>>): void;

  // Sessions
  insertSession(session: DbSession): void;
  revokeSession(sessionId: string): void;
  revokeSessionByTokenHash(tokenHash: string): void;
  getActiveSession(sessionId: string): DbSession | undefined;

  // System Config
  upsertConfig(entry: DbConfigEntry): void;
  getConfig(key: string): DbConfigEntry | undefined;
  listConfig(): DbConfigEntry[];

  // Config Proposals
  insertProposal(proposal: DbConfigProposal): void;
  updateProposalStatus(proposalId: string, status: 'ratified' | 'rejected', decidedBy: string, rejectionReason?: string): void;
  getPendingProposals(): DbConfigProposal[];
  getProposal(proposalId: string): DbConfigProposal | undefined;

  // Exception Requests
  insertException(ex: DbException): void;
  getException(exceptionId: string): DbException | undefined;
  listExceptions(filter?: { submitter_id?: string; exception_type?: string }): DbException[];
  listExceptionsByEvent(eventId: string): DbException[];
  updateExceptionStatus(exceptionId: string, status: string): void;
  insertExceptionDecision(decision: DbExceptionDecision): void;
  getDecisionsForException(exceptionId: string): DbExceptionDecision[];

  // Upload Records
  insertUploadRecord(record: DbUploadRecord): void;
  getUploadRecord(fileId: string): DbUploadRecord | undefined;
  getUploadRecordByFilename(filename: string): DbUploadRecord | undefined;
  deleteUploadRecord(fileId: string): void;

  // Access Log
  insertAccessLog(entry: DbAccessLog): void;
  getAccessLog(resourceId: string): DbAccessLog[];
  getAccessLogByUser(userId: string, since?: string): DbAccessLog[];
  listAccessLog(since?: string, limit?: number): DbAccessLog[];

  // Draft Rulings
  saveDraftRuling(reviewId: string, draftReasoning: string): void;
  updateShariahReviewEscalation(reviewId: string, escalationStatus: string): void;

  // AAOIFI Standards
  insertStandard(standard: DbStandard): void;
  listStandards(activeOnly?: boolean): DbStandard[];
  getStandard(standardId: string): DbStandard | undefined;
  getStandardByCode(code: string): DbStandard | undefined;

  // Shariah Reviewers
  insertShariahReviewer(reviewer: DbShariahReviewer): void;
  getShariahReviewerByUserId(userId: string): DbShariahReviewer | undefined;
  getShariahReviewerById(reviewerId: string): DbShariahReviewer | undefined;
  listShariahReviewers(activeOnly?: boolean): DbShariahReviewer[];
  updateShariahReviewer(reviewerId: string, updates: Partial<Pick<DbShariahReviewer, 'appointment_period_end' | 'active' | 'credentials'>>): void;

  // Shariah Reviews (list all)
  listShariahReviews(): unknown[];
}
