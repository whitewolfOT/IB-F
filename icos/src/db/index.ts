import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { LedgerEntry } from '../ledger';
import { IcosEvent } from '../events';
import { ApprovalAuditEvent } from '../approval';
import { ComplianceFlag } from '../shariah';

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
}
