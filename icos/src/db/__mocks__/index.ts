// Jest manual mock for IcosDb.
// Activated when jest.config.ts moduleNameMapper routes '../../db' or '../db' here.
// The real DB tests import from '../index' directly and are NOT affected by this mock.

import { LedgerEntry } from '../../ledger';
import { IcosEvent } from '../../events';
import { ApprovalAuditEvent } from '../../approval';
import { ComplianceFlag } from '../../shariah';

// Re-export all interfaces so import sites that import types from '../../db' keep working.
export type {
  DbUser,
  DbSession,
  DbConfigEntry,
  DbConfigProposal,
  DbException,
  DbExceptionDecision,
  DbUploadRecord,
  DbAccessLog,
  DbStandard,
  DbShariahReviewer,
  DbParty,
  DbAsset,
  DbContract,
} from '../index';

import type {
  DbUser,
  DbSession,
  DbConfigEntry,
  DbConfigProposal,
  DbException,
  DbExceptionDecision,
  DbUploadRecord,
  DbAccessLog,
  DbStandard,
  DbShariahReviewer,
  DbParty,
  DbAsset,
  DbContract,
} from '../index';

export class IcosDb {
  private parties = new Map<string, DbParty>();
  private assets = new Map<string, DbAsset>();
  private contracts = new Map<string, DbContract>();
  private events = new Map<string, Omit<IcosEvent, 'counterparties'> & { counterparties: string[] }>();
  private eventCounterparties = new Map<string, string[]>();
  private ledgerEntries = new Map<string, LedgerEntry>();
  private auditEvents: ApprovalAuditEvent[] = [];
  private complianceFlags = new Map<string, ComplianceFlag[]>();
  private shariahReviews = new Map<string, Record<string, unknown>>();
  private shariahOverrides = new Map<string, Record<string, unknown>[]>();
  private instruments = new Map<string, Record<string, unknown>>();
  private users = new Map<string, DbUser>();
  private sessions = new Map<string, DbSession>();
  private configs = new Map<string, DbConfigEntry>();
  private proposals = new Map<string, DbConfigProposal>();
  private exceptions = new Map<string, DbException>();
  private exceptionDecisions = new Map<string, DbExceptionDecision[]>();
  private uploads = new Map<string, DbUploadRecord>();
  private standards = new Map<string, DbStandard>();
  private shariahReviewers = new Map<string, DbShariahReviewer>();
  private accessLogs: DbAccessLog[] = [];

  constructor(_path?: string) {} // ignore path — always in-memory
  close(): void {}
  initialize(): void {}

  // ── Parties ──────────────────────────────────────────────────────────────

  upsertParty(party: DbParty): void {
    this.parties.set(party.party_id, party);
  }

  getParty(partyId: string): DbParty | undefined {
    return this.parties.get(partyId);
  }

  listParties(): DbParty[] {
    return Array.from(this.parties.values());
  }

  // ── Assets ───────────────────────────────────────────────────────────────

  upsertAsset(asset: DbAsset): void {
    this.assets.set(asset.asset_id, asset);
  }

  getAsset(assetId: string): DbAsset | undefined {
    return this.assets.get(assetId);
  }

  listAssets(): DbAsset[] {
    return Array.from(this.assets.values());
  }

  // ── Contracts ─────────────────────────────────────────────────────────────

  insertContract(contract: DbContract): void {
    this.contracts.set(contract.contract_id, contract);
  }

  updateContractStatus(contractId: string, status: string, shariahScore?: number): void {
    const c = this.contracts.get(contractId);
    if (c) this.contracts.set(contractId, { ...c, status, shariah_score: shariahScore ?? c.shariah_score, updated_at: new Date().toISOString() });
  }

  getContract(contractId: string): DbContract | undefined {
    return this.contracts.get(contractId);
  }

  listContracts(status?: string): DbContract[] {
    const all = Array.from(this.contracts.values());
    return status ? all.filter(c => c.status === status) : all;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  insertEvent(event: IcosEvent): void {
    const { counterparties, ...rest } = event;
    this.events.set(event.event_id, { ...rest, counterparties: [...counterparties] });
  }

  updateEventState(eventId: string, approvalState: string): void {
    const e = this.events.get(eventId);
    if (e) this.events.set(eventId, { ...e, approval_state: approvalState as IcosEvent['approval_state'] });
  }

  getEvent(eventId: string): (Omit<IcosEvent, 'counterparties'> & { counterparties: string[] }) | undefined {
    return this.events.get(eventId);
  }

  listEvents(linkedContractId?: string): Record<string, unknown>[] {
    const all = Array.from(this.events.values()) as Record<string, unknown>[];
    return linkedContractId ? all.filter(e => e.linked_contract_id === linkedContractId) : all;
  }

  // ── Ledger Entries ────────────────────────────────────────────────────────

  insertLedgerEntry(entry: LedgerEntry): void {
    this.ledgerEntries.set(entry.entry_id, entry);
  }

  finalizeLedgerEntry(_entryId: string): void {}

  attemptLedgerUpdate(entryId: string, amount: number): void {
    const e = this.ledgerEntries.get(entryId);
    if (e) this.ledgerEntries.set(entryId, { ...e, amount });
  }

  getLedgerEntriesForContract(contractId: string): LedgerEntry[] {
    return Array.from(this.ledgerEntries.values()).filter(e => e.linked_contract_id === contractId);
  }

  // ── Approval Audit Trail ──────────────────────────────────────────────────

  insertApprovalAuditEvent(auditEvent: ApprovalAuditEvent): void {
    this.auditEvents.push(auditEvent);
  }

  getAuditTrail(objectId: string): ApprovalAuditEvent[] {
    return this.auditEvents.filter(e => e.related_object_id === objectId);
  }

  // ── Compliance Flags ──────────────────────────────────────────────────────

  insertComplianceFlag(flag: ComplianceFlag): void {
    const existing = this.complianceFlags.get(flag.contract_id) ?? [];
    this.complianceFlags.set(flag.contract_id, [...existing, flag]);
  }

  getComplianceFlagsForContract(contractId: string): ComplianceFlag[] {
    return this.complianceFlags.get(contractId) ?? [];
  }

  // ── Shariah Review Records ────────────────────────────────────────────────

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
  }): void {
    this.shariahReviews.set(record.review_id, record as Record<string, unknown>);
  }

  getShariahReviewsForContract(contractId: string): unknown[] {
    return Array.from(this.shariahReviews.values()).filter(r => r.related_contract_id === contractId);
  }

  getShariahReview(reviewId: string): Record<string, unknown> | undefined {
    return this.shariahReviews.get(reviewId);
  }

  listShariahReviews(): unknown[] {
    return Array.from(this.shariahReviews.values());
  }

  insertShariahOverride(override: {
    override_id: string;
    overridden_ruling_id: string;
    authorizing_entities: string[];
    justification: string;
    risk_acknowledgment: string;
    expiration_conditions: string;
    timestamp: string;
  }): void {
    const existing = this.shariahOverrides.get(override.overridden_ruling_id) ?? [];
    this.shariahOverrides.set(override.overridden_ruling_id, [...existing, override as Record<string, unknown>]);
  }

  getShariahOverridesForReview(reviewId: string): unknown[] {
    return this.shariahOverrides.get(reviewId) ?? [];
  }

  updateShariahReviewRuling(reviewId: string, params: {
    ruling_type: string;
    legal_reasoning: string;
    ruling_confidence: number;
    freeze_settlement: boolean;
    block_profit_distribution: boolean;
    digital_signature: string;
    ruling_json: string;
  }): void {
    const existing = this.shariahReviews.get(reviewId);
    if (existing) this.shariahReviews.set(reviewId, { ...existing, ...params });
  }

  // ── Supporting Instruments ─────────────────────────────────────────────────

  insertInstrument(instrument: { instrument_id: string; instrument_type: string; linked_contract_id: string; data_json: string; created_at: string }): void {
    this.instruments.set(instrument.instrument_id, { ...instrument, data: JSON.parse(instrument.data_json) });
  }

  getInstrument(instrumentId: string): Record<string, unknown> | undefined {
    return this.instruments.get(instrumentId);
  }

  listInstrumentsForContract(contractId: string): Record<string, unknown>[] {
    return Array.from(this.instruments.values()).filter(i => i.linked_contract_id === contractId);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  insertUser(user: DbUser): void {
    this.users.set(user.user_id, user);
  }

  getUserByEmail(email: string): DbUser | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUserById(userId: string): DbUser | undefined {
    return this.users.get(userId);
  }

  listUsers(): DbUser[] {
    return Array.from(this.users.values());
  }

  updateUser(userId: string, updates: Partial<Pick<DbUser, 'role' | 'active' | 'party_id' | 'updated_at'>>): void {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, ...updates });
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  insertSession(session: DbSession): void {
    this.sessions.set(session.session_id, session);
  }

  revokeSession(sessionId: string): void {
    const s = this.sessions.get(sessionId);
    if (s) this.sessions.set(sessionId, { ...s, revoked: true });
  }

  revokeSessionByTokenHash(tokenHash: string): void {
    for (const [id, s] of this.sessions) {
      if (s.token_hash === tokenHash) this.sessions.set(id, { ...s, revoked: true });
    }
  }

  getActiveSession(sessionId: string): DbSession | undefined {
    const s = this.sessions.get(sessionId);
    if (!s || s.revoked) return undefined;
    if (s.expires_at < new Date().toISOString()) return undefined;
    return s;
  }

  // ── System Config ─────────────────────────────────────────────────────────

  upsertConfig(entry: DbConfigEntry): void {
    this.configs.set(entry.config_key, entry);
  }

  getConfig(key: string): DbConfigEntry | undefined {
    return this.configs.get(key);
  }

  listConfig(): DbConfigEntry[] {
    return Array.from(this.configs.values());
  }

  // ── Config Proposals ──────────────────────────────────────────────────────

  insertProposal(proposal: DbConfigProposal): void {
    this.proposals.set(proposal.proposal_id, proposal);
  }

  updateProposalStatus(proposalId: string, status: 'ratified' | 'rejected', decidedBy: string, rejectionReason?: string): void {
    const p = this.proposals.get(proposalId);
    if (p) this.proposals.set(proposalId, { ...p, status, decided_by: decidedBy, decided_at: new Date().toISOString(), rejection_reason: rejectionReason ?? null });
  }

  getPendingProposals(): DbConfigProposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === 'pending');
  }

  getProposal(proposalId: string): DbConfigProposal | undefined {
    return this.proposals.get(proposalId);
  }

  // ── Exception Requests ────────────────────────────────────────────────────

  insertException(ex: DbException): void {
    this.exceptions.set(ex.exception_id, ex);
  }

  getException(exceptionId: string): DbException | undefined {
    return this.exceptions.get(exceptionId);
  }

  listExceptions(filter?: { submitter_id?: string; exception_type?: string }): DbException[] {
    let all = Array.from(this.exceptions.values());
    if (filter?.submitter_id) all = all.filter(e => e.submitter_id === filter.submitter_id);
    if (filter?.exception_type) all = all.filter(e => e.exception_type === filter.exception_type);
    return all;
  }

  listExceptionsByEvent(eventId: string): DbException[] {
    return Array.from(this.exceptions.values()).filter(e => e.event_id === eventId);
  }

  updateExceptionStatus(exceptionId: string, status: string): void {
    const e = this.exceptions.get(exceptionId);
    if (e) this.exceptions.set(exceptionId, { ...e, status: status as DbException['status'], updated_at: new Date().toISOString() });
  }

  insertExceptionDecision(decision: DbExceptionDecision): void {
    const existing = this.exceptionDecisions.get(decision.exception_id) ?? [];
    this.exceptionDecisions.set(decision.exception_id, [...existing, decision]);
  }

  getDecisionsForException(exceptionId: string): DbExceptionDecision[] {
    return this.exceptionDecisions.get(exceptionId) ?? [];
  }

  // ── Upload Records ────────────────────────────────────────────────────────

  insertUploadRecord(record: DbUploadRecord): void {
    this.uploads.set(record.file_id, record);
  }

  getUploadRecord(fileId: string): DbUploadRecord | undefined {
    return this.uploads.get(fileId);
  }

  getUploadRecordByFilename(filename: string): DbUploadRecord | undefined {
    return Array.from(this.uploads.values()).find(u => u.filename === filename);
  }

  deleteUploadRecord(fileId: string): void {
    this.uploads.delete(fileId);
  }

  // ── Access Log ────────────────────────────────────────────────────────────

  insertAccessLog(entry: DbAccessLog): void {
    this.accessLogs.push(entry);
  }

  getAccessLog(resourceId: string): DbAccessLog[] {
    return this.accessLogs.filter(e => e.resource_id === resourceId);
  }

  getAccessLogByUser(userId: string, since?: string): DbAccessLog[] {
    let logs = this.accessLogs.filter(e => e.user_id === userId);
    if (since) logs = logs.filter(e => e.accessed_at >= since);
    return logs;
  }

  listAccessLog(since?: string, limit = 100): DbAccessLog[] {
    let logs = since ? this.accessLogs.filter(e => e.accessed_at >= since) : [...this.accessLogs];
    return logs.slice(0, limit);
  }

  // ── Draft Rulings ─────────────────────────────────────────────────────────

  saveDraftRuling(reviewId: string, draftReasoning: string): void {
    const r = this.shariahReviews.get(reviewId);
    if (r) this.shariahReviews.set(reviewId, { ...r, draft_reasoning: draftReasoning, draft_updated_at: new Date().toISOString() });
  }

  updateShariahReviewEscalation(reviewId: string, escalationStatus: string): void {
    const r = this.shariahReviews.get(reviewId);
    if (r) this.shariahReviews.set(reviewId, { ...r, escalation_status: escalationStatus });
  }

  // ── AAOIFI Standards ──────────────────────────────────────────────────────

  insertStandard(standard: DbStandard): void {
    this.standards.set(standard.standard_id, standard);
  }

  listStandards(activeOnly = true): DbStandard[] {
    const all = Array.from(this.standards.values());
    return activeOnly ? all.filter(s => s.active) : all;
  }

  getStandard(standardId: string): DbStandard | undefined {
    return this.standards.get(standardId);
  }

  getStandardByCode(code: string): DbStandard | undefined {
    return Array.from(this.standards.values()).find(s => s.code === code);
  }

  // ── Shariah Reviewers ─────────────────────────────────────────────────────

  insertShariahReviewer(reviewer: DbShariahReviewer): void {
    this.shariahReviewers.set(reviewer.reviewer_id, reviewer);
  }

  getShariahReviewerByUserId(userId: string): DbShariahReviewer | undefined {
    return Array.from(this.shariahReviewers.values()).find(r => r.user_id === userId);
  }

  getShariahReviewerById(reviewerId: string): DbShariahReviewer | undefined {
    return this.shariahReviewers.get(reviewerId);
  }

  listShariahReviewers(activeOnly = false): DbShariahReviewer[] {
    const all = Array.from(this.shariahReviewers.values());
    return activeOnly ? all.filter(r => r.active) : all;
  }

  updateShariahReviewer(reviewerId: string, updates: Partial<Pick<DbShariahReviewer, 'appointment_period_end' | 'active' | 'credentials'>>): void {
    const r = this.shariahReviewers.get(reviewerId);
    if (r) this.shariahReviewers.set(reviewerId, { ...r, ...updates });
  }
}
