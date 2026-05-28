import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { LedgerEntry } from '../ledger';
import { IcosEvent } from '../events';
import { ApprovalAuditEvent } from '../approval';
import { ComplianceFlag } from '../shariah';

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

export class IcosDb {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }

  // ── Parties ──────────────────────────────────────────────────────────────

  upsertParty(party: DbParty): void {
    this.db.prepare(`
      INSERT INTO parties (party_id, name, role, country, verification_status)
      VALUES (@party_id, @name, @role, @country, @verification_status)
      ON CONFLICT(party_id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        country = excluded.country,
        verification_status = excluded.verification_status
    `).run({ ...party, verification_status: party.verification_status ? 1 : 0 });
  }

  getParty(partyId: string): DbParty | undefined {
    const row = this.db.prepare('SELECT * FROM parties WHERE party_id = ?').get(partyId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...row, verification_status: row.verification_status === 1 } as DbParty;
  }

  listParties(): DbParty[] {
    const rows = this.db.prepare('SELECT * FROM parties ORDER BY party_id ASC').all() as Record<string, unknown>[];
    return rows.map(row => ({ ...row, verification_status: row.verification_status === 1 }) as DbParty);
  }

  // ── Assets ───────────────────────────────────────────────────────────────

  upsertAsset(asset: DbAsset): void {
    this.db.prepare(`
      INSERT INTO assets (asset_id, asset_type, ownership_status, valuation, description)
      VALUES (@asset_id, @asset_type, @ownership_status, @valuation, @description)
      ON CONFLICT(asset_id) DO UPDATE SET
        asset_type = excluded.asset_type,
        ownership_status = excluded.ownership_status,
        valuation = excluded.valuation,
        description = excluded.description
    `).run(asset);
  }

  getAsset(assetId: string): DbAsset | undefined {
    return this.db.prepare('SELECT * FROM assets WHERE asset_id = ?').get(assetId) as DbAsset | undefined;
  }

  listAssets(): DbAsset[] {
    return this.db.prepare('SELECT * FROM assets ORDER BY asset_id ASC').all() as DbAsset[];
  }

  // ── Contracts ─────────────────────────────────────────────────────────────

  insertContract(contract: DbContract): void {
    this.db.prepare(`
      INSERT INTO contracts (contract_id, contract_type, status, shariah_score, created_at, updated_at)
      VALUES (@contract_id, @contract_type, @status, @shariah_score, @created_at, @updated_at)
    `).run(contract);
  }

  updateContractStatus(contractId: string, status: string, shariahScore?: number): void {
    this.db.prepare(`
      UPDATE contracts SET status = @status, shariah_score = @shariah_score, updated_at = @updated_at
      WHERE contract_id = @contract_id
    `).run({
      contract_id: contractId,
      status,
      shariah_score: shariahScore ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  getContract(contractId: string): DbContract | undefined {
    return this.db.prepare('SELECT * FROM contracts WHERE contract_id = ?').get(contractId) as DbContract | undefined;
  }

  listContracts(status?: string): DbContract[] {
    if (status) {
      return this.db.prepare('SELECT * FROM contracts WHERE status = ? ORDER BY created_at DESC').all(status) as DbContract[];
    }
    return this.db.prepare('SELECT * FROM contracts ORDER BY created_at DESC').all() as DbContract[];
  }

  // ── Events ────────────────────────────────────────────────────────────────

  insertEvent(event: IcosEvent): void {
    this.db.prepare(`
      INSERT INTO events (event_id, event_type, linked_contract_id, location, asset_reference,
        quantity, unit, created_by, approval_state, timestamp)
      VALUES (@event_id, @event_type, @linked_contract_id, @location, @asset_reference,
        @quantity, @unit, @created_by, @approval_state, @timestamp)
    `).run(event);

    const insertCP = this.db.prepare(
      'INSERT OR IGNORE INTO event_counterparties (event_id, party_id) VALUES (?, ?)'
    );
    for (const partyId of event.counterparties) {
      insertCP.run(event.event_id, partyId);
    }
  }

  updateEventState(eventId: string, approvalState: string): void {
    this.db.prepare('UPDATE events SET approval_state = ? WHERE event_id = ?')
      .run(approvalState, eventId);
  }

  getEvent(eventId: string): (Omit<IcosEvent, 'counterparties'> & { counterparties: string[] }) | undefined {
    const row = this.db.prepare('SELECT * FROM events WHERE event_id = ?').get(eventId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const counterparties = (
      this.db.prepare('SELECT party_id FROM event_counterparties WHERE event_id = ?').all(eventId) as { party_id: string }[]
    ).map(r => r.party_id);
    return { ...row, counterparties } as Omit<IcosEvent, 'counterparties'> & { counterparties: string[] };
  }

  listEvents(linkedContractId?: string): Record<string, unknown>[] {
    if (linkedContractId) {
      return this.db.prepare(
        'SELECT * FROM events WHERE linked_contract_id = ? ORDER BY timestamp DESC'
      ).all(linkedContractId) as Record<string, unknown>[];
    }
    return this.db.prepare('SELECT * FROM events ORDER BY timestamp DESC').all() as Record<string, unknown>[];
  }

  // ── Ledger Entries ────────────────────────────────────────────────────────

  insertLedgerEntry(entry: LedgerEntry): void {
    this.db.prepare(`
      INSERT INTO ledger_entries
        (entry_id, originating_event_id, linked_contract_id, debit_account, credit_account,
         amount, currency, asset_reference, created_by, approval_state, audit_hash, timestamp)
      VALUES
        (@entry_id, @originating_event_id, @linked_contract_id, @debit_account, @credit_account,
         @amount, @currency, @asset_reference, @created_by, @approval_state, @audit_hash, @timestamp)
    `).run(entry);

    const insertCP = this.db.prepare(
      'INSERT OR IGNORE INTO ledger_entry_counterparties (entry_id, party_id) VALUES (?, ?)'
    );
    for (const partyId of entry.counterparties) {
      insertCP.run(entry.entry_id, partyId);
    }

    this.finalizeLedgerEntry(entry.entry_id);
  }

  finalizeLedgerEntry(entryId: string): void {
    this.db.prepare('UPDATE ledger_entries SET finalized = 1 WHERE entry_id = ? AND finalized = 0').run(entryId);
  }

  attemptLedgerUpdate(entryId: string, amount: number): void {
    this.db.prepare('UPDATE ledger_entries SET amount = ? WHERE entry_id = ?').run(amount, entryId);
  }

  getLedgerEntriesForContract(contractId: string): LedgerEntry[] {
    const rows = this.db.prepare(
      'SELECT * FROM ledger_entries WHERE linked_contract_id = ? ORDER BY timestamp ASC'
    ).all(contractId) as Omit<LedgerEntry, 'counterparties'>[];

    return rows.map(row => {
      const counterparties = (
        this.db.prepare('SELECT party_id FROM ledger_entry_counterparties WHERE entry_id = ?').all(row.entry_id) as { party_id: string }[]
      ).map(r => r.party_id);
      return { ...row, counterparties } as LedgerEntry;
    });
  }

  // ── Approval Audit Trail ──────────────────────────────────────────────────

  insertApprovalAuditEvent(auditEvent: ApprovalAuditEvent): void {
    this.db.prepare(`
      INSERT INTO approval_audit_events
        (audit_event_id, related_object_id, reviewer_entity, reviewer_role,
         prior_state, new_state, decision, decision_reason, digital_signature, timestamp)
      VALUES
        (@audit_event_id, @related_object_id, @reviewer_entity, @reviewer_role,
         @prior_state, @new_state, @decision, @decision_reason, @digital_signature, @timestamp)
    `).run(auditEvent);
  }

  getAuditTrail(objectId: string): ApprovalAuditEvent[] {
    return this.db.prepare(
      'SELECT * FROM approval_audit_events WHERE related_object_id = ? ORDER BY timestamp ASC'
    ).all(objectId) as ApprovalAuditEvent[];
  }

  // ── Compliance Flags ──────────────────────────────────────────────────────

  insertComplianceFlag(flag: ComplianceFlag): void {
    this.db.prepare(`
      INSERT INTO compliance_flags (flag_id, contract_id, violation_type, severity, notes, created_at)
      VALUES (@flag_id, @contract_id, @violation_type, @severity, @notes, @created_at)
    `).run(flag);
  }

  getComplianceFlagsForContract(contractId: string): ComplianceFlag[] {
    return this.db.prepare(
      'SELECT * FROM compliance_flags WHERE contract_id = ? ORDER BY created_at DESC'
    ).all(contractId) as ComplianceFlag[];
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
    this.db.prepare(`
      INSERT INTO shariah_review_records
        (review_id, related_contract_id, reviewer_id, triggering_reason, legal_reasoning,
         ruling_type, ruling_confidence, freeze_settlement, block_profit_distribution,
         escalation_status, digital_signature, timestamp)
      VALUES
        (@review_id, @related_contract_id, @reviewer_id, @triggering_reason, @legal_reasoning,
         @ruling_type, @ruling_confidence, @freeze_settlement, @block_profit_distribution,
         @escalation_status, @digital_signature, @timestamp)
    `).run({
      ...record,
      freeze_settlement: record.freeze_settlement ? 1 : 0,
      block_profit_distribution: record.block_profit_distribution ? 1 : 0,
    });
  }

  getShariahReviewsForContract(contractId: string): unknown[] {
    return this.db.prepare(
      'SELECT * FROM shariah_review_records WHERE related_contract_id = ? ORDER BY timestamp DESC'
    ).all(contractId);
  }

  getShariahReview(reviewId: string): Record<string, unknown> | undefined {
    return this.db.prepare(
      'SELECT * FROM shariah_review_records WHERE review_id = ?'
    ).get(reviewId) as Record<string, unknown> | undefined;
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
    this.db.prepare(`
      INSERT INTO shariah_override_events
        (override_id, overridden_ruling_id, authorizing_entities, justification,
         risk_acknowledgment, expiration_conditions, timestamp)
      VALUES
        (@override_id, @overridden_ruling_id, @authorizing_entities, @justification,
         @risk_acknowledgment, @expiration_conditions, @timestamp)
    `).run({ ...override, authorizing_entities: JSON.stringify(override.authorizing_entities) });
  }

  getShariahOverridesForReview(reviewId: string): unknown[] {
    const rows = this.db.prepare(
      'SELECT * FROM shariah_override_events WHERE overridden_ruling_id = ? ORDER BY timestamp DESC'
    ).all(reviewId) as Record<string, unknown>[];
    return rows.map(row => ({
      ...row,
      authorizing_entities: JSON.parse(String(row.authorizing_entities)),
    }));
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
    this.db.prepare(`
      UPDATE shariah_review_records
      SET ruling_type = @ruling_type,
          legal_reasoning = @legal_reasoning,
          ruling_confidence = @ruling_confidence,
          freeze_settlement = @freeze_settlement,
          block_profit_distribution = @block_profit_distribution,
          digital_signature = @digital_signature,
          ruling_json = @ruling_json
      WHERE review_id = @review_id
    `).run({
      review_id: reviewId,
      ruling_type: params.ruling_type,
      legal_reasoning: params.legal_reasoning,
      ruling_confidence: params.ruling_confidence,
      freeze_settlement: params.freeze_settlement ? 1 : 0,
      block_profit_distribution: params.block_profit_distribution ? 1 : 0,
      digital_signature: params.digital_signature,
      ruling_json: params.ruling_json,
    });
  }

  // ── Supporting Instruments (§6H) ─────────────────────────────────────────

  insertInstrument(instrument: { instrument_id: string; instrument_type: string; linked_contract_id: string; data_json: string; created_at: string }): void {
    this.db.prepare(`
      INSERT INTO supporting_instruments (instrument_id, instrument_type, linked_contract_id, data_json, created_at)
      VALUES (@instrument_id, @instrument_type, @linked_contract_id, @data_json, @created_at)
    `).run(instrument);
  }

  getInstrument(instrumentId: string): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT * FROM supporting_instruments WHERE instrument_id = ?').get(instrumentId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...row, data: JSON.parse(String(row.data_json)) };
  }

  listInstrumentsForContract(contractId: string): Record<string, unknown>[] {
    const rows = this.db.prepare(
      'SELECT * FROM supporting_instruments WHERE linked_contract_id = ? ORDER BY created_at ASC'
    ).all(contractId) as Record<string, unknown>[];
    return rows.map(row => ({ ...row, data: JSON.parse(String(row.data_json)) }));
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  insertUser(user: DbUser): void {
    this.db.prepare(`
      INSERT INTO users (user_id, email, password_hash, role, party_id, is_master, active, created_at, updated_at)
      VALUES (@user_id, @email, @password_hash, @role, @party_id, @is_master, @active, @created_at, @updated_at)
    `).run({ ...user, is_master: user.is_master ? 1 : 0, active: user.active ? 1 : 0 });
  }

  getUserByEmail(email: string): DbUser | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...row, is_master: row.is_master === 1, active: row.active === 1 } as DbUser;
  }

  getUserById(userId: string): DbUser | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...row, is_master: row.is_master === 1, active: row.active === 1 } as DbUser;
  }

  listUsers(): DbUser[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as Record<string, unknown>[];
    return rows.map(row => ({ ...row, is_master: row.is_master === 1, active: row.active === 1 }) as DbUser);
  }

  updateUser(userId: string, updates: Partial<Pick<DbUser, 'role' | 'active' | 'party_id' | 'updated_at'>>): void {
    const fields: string[] = [];
    const params: Record<string, unknown> = { user_id: userId };
    if (updates.role !== undefined) { fields.push('role = @role'); params.role = updates.role; }
    if (updates.active !== undefined) { fields.push('active = @active'); params.active = updates.active ? 1 : 0; }
    if (updates.party_id !== undefined) { fields.push('party_id = @party_id'); params.party_id = updates.party_id; }
    if (updates.updated_at !== undefined) { fields.push('updated_at = @updated_at'); params.updated_at = updates.updated_at; }
    if (fields.length === 0) return;
    this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE user_id = @user_id`).run(params);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  insertSession(session: DbSession): void {
    this.db.prepare(`
      INSERT INTO user_sessions (session_id, user_id, token_hash, created_at, expires_at, revoked)
      VALUES (@session_id, @user_id, @token_hash, @created_at, @expires_at, 0)
    `).run(session);
  }

  revokeSession(sessionId: string): void {
    this.db.prepare('UPDATE user_sessions SET revoked = 1 WHERE session_id = ?').run(sessionId);
  }

  revokeSessionByTokenHash(tokenHash: string): void {
    this.db.prepare('UPDATE user_sessions SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
  }

  getActiveSession(sessionId: string): DbSession | undefined {
    const now = new Date().toISOString();
    const row = this.db.prepare(
      'SELECT * FROM user_sessions WHERE session_id = ? AND revoked = 0 AND expires_at > ?'
    ).get(sessionId, now) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...row, revoked: row.revoked === 1 } as DbSession;
  }

  // ── System Config ─────────────────────────────────────────────────────────

  upsertConfig(entry: DbConfigEntry): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO system_config (config_key, config_value, value_type, description, updated_at, updated_by)
      VALUES (@config_key, @config_value, @value_type, @description, @updated_at, @updated_by)
    `).run(entry);
  }

  getConfig(key: string): DbConfigEntry | undefined {
    return this.db.prepare('SELECT * FROM system_config WHERE config_key = ?').get(key) as DbConfigEntry | undefined;
  }

  listConfig(): DbConfigEntry[] {
    return this.db.prepare('SELECT * FROM system_config ORDER BY config_key ASC').all() as DbConfigEntry[];
  }

  // ── Config Proposals ──────────────────────────────────────────────────────

  insertProposal(proposal: DbConfigProposal): void {
    this.db.prepare(`
      INSERT INTO config_proposals
        (proposal_id, config_key, current_value, proposed_value, proposed_by, proposed_at,
         status, decided_by, decided_at, rejection_reason)
      VALUES
        (@proposal_id, @config_key, @current_value, @proposed_value, @proposed_by, @proposed_at,
         @status, @decided_by, @decided_at, @rejection_reason)
    `).run(proposal);
  }

  updateProposalStatus(proposalId: string, status: 'ratified' | 'rejected', decidedBy: string, rejectionReason?: string): void {
    this.db.prepare(`
      UPDATE config_proposals
      SET status = @status, decided_by = @decided_by, decided_at = @decided_at, rejection_reason = @rejection_reason
      WHERE proposal_id = @proposal_id
    `).run({
      proposal_id: proposalId,
      status,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      rejection_reason: rejectionReason ?? null,
    });
  }

  getPendingProposals(): DbConfigProposal[] {
    return this.db.prepare(
      "SELECT * FROM config_proposals WHERE status = 'pending' ORDER BY proposed_at ASC"
    ).all() as DbConfigProposal[];
  }

  getProposal(proposalId: string): DbConfigProposal | undefined {
    return this.db.prepare('SELECT * FROM config_proposals WHERE proposal_id = ?').get(proposalId) as DbConfigProposal | undefined;
  }
}
