export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS parties (
  party_id          TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN (
    'operator','warehouse_manager','procurement_officer','financial_controller',
    'risk_officer','compliance_officer','shariah_reviewer','senior_shariah_board',
    'auditor','settlement_officer','counterparty'
  )),
  country           TEXT NOT NULL,
  verification_status INTEGER NOT NULL DEFAULT 0 CHECK (verification_status IN (0, 1))
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id          TEXT PRIMARY KEY,
  asset_type        TEXT NOT NULL,
  ownership_status  TEXT NOT NULL CHECK (ownership_status IN ('owned','leased','pledged','disputed','transferred')),
  valuation         REAL NOT NULL CHECK (valuation >= 0),
  description       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  contract_id       TEXT PRIMARY KEY,
  contract_type     TEXT NOT NULL CHECK (contract_type IN (
    'spot_sale','murabaha','deferred_payment_sale',
    'salam','parallel_salam',
    'istisna','parallel_istisna',
    'mudaraba','musharaka',
    'ijarah','ijarah_muntahia_bittamleek',
    'wakala','wakala_bi_al_istithmar',
    'qard'
  )),
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','under_review','operationally_verified','financially_verified',
    'compliance_review','shariah_review','approved','rejected',
    'returned_for_revision','suspended','settled','archived'
  )),
  shariah_score     INTEGER CHECK (shariah_score >= 0 AND shariah_score <= 100),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id          TEXT PRIMARY KEY,
  event_type        TEXT NOT NULL,
  linked_contract_id TEXT NOT NULL REFERENCES contracts(contract_id),
  location          TEXT NOT NULL,
  asset_reference   TEXT NOT NULL,
  quantity          REAL NOT NULL,
  unit              TEXT NOT NULL,
  created_by        TEXT NOT NULL,
  approval_state    TEXT NOT NULL DEFAULT 'draft',
  timestamp         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_counterparties (
  event_id          TEXT NOT NULL REFERENCES events(event_id),
  party_id          TEXT NOT NULL,
  PRIMARY KEY (event_id, party_id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  entry_id              TEXT PRIMARY KEY,
  originating_event_id  TEXT NOT NULL REFERENCES events(event_id),
  linked_contract_id    TEXT NOT NULL REFERENCES contracts(contract_id),
  debit_account         TEXT NOT NULL,
  credit_account        TEXT NOT NULL,
  amount                REAL NOT NULL CHECK (amount > 0),
  currency              TEXT NOT NULL,
  asset_reference       TEXT NOT NULL,
  created_by            TEXT NOT NULL,
  approval_state        TEXT NOT NULL,
  audit_hash            TEXT NOT NULL,
  timestamp             TEXT NOT NULL,
  finalized             INTEGER NOT NULL DEFAULT 0 CHECK (finalized IN (0,1))
);

CREATE TRIGGER IF NOT EXISTS prevent_finalized_ledger_update
BEFORE UPDATE ON ledger_entries
WHEN OLD.finalized = 1
BEGIN
  SELECT RAISE(ABORT, 'Ledger entry is finalized and cannot be modified');
END;

CREATE TABLE IF NOT EXISTS ledger_entry_counterparties (
  entry_id    TEXT NOT NULL REFERENCES ledger_entries(entry_id),
  party_id    TEXT NOT NULL,
  PRIMARY KEY (entry_id, party_id)
);

CREATE TABLE IF NOT EXISTS approval_audit_events (
  audit_event_id        TEXT PRIMARY KEY,
  related_object_id     TEXT NOT NULL,
  reviewer_entity       TEXT NOT NULL,
  reviewer_role         TEXT NOT NULL,
  prior_state           TEXT NOT NULL,
  new_state             TEXT NOT NULL,
  decision              TEXT NOT NULL,
  decision_reason       TEXT NOT NULL,
  digital_signature     TEXT NOT NULL,
  timestamp             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compliance_flags (
  flag_id           TEXT PRIMARY KEY,
  contract_id       TEXT NOT NULL REFERENCES contracts(contract_id),
  violation_type    TEXT NOT NULL,
  severity          TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  notes             TEXT NOT NULL,
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shariah_review_records (
  review_id             TEXT PRIMARY KEY,
  related_contract_id   TEXT NOT NULL REFERENCES contracts(contract_id),
  reviewer_id           TEXT NOT NULL,
  triggering_reason     TEXT NOT NULL,
  legal_reasoning       TEXT NOT NULL DEFAULT '',
  ruling_type           TEXT CHECK (ruling_type IN (
    'compliant','conditionally_compliant','non_compliant','requires_modification',
    'requires_escalation','pending_additional_information','suspended_pending_review'
  )),
  ruling_confidence     REAL NOT NULL DEFAULT 0 CHECK (ruling_confidence >= 0 AND ruling_confidence <= 1),
  freeze_settlement     INTEGER NOT NULL DEFAULT 0 CHECK (freeze_settlement IN (0, 1)),
  block_profit_distribution INTEGER NOT NULL DEFAULT 0 CHECK (block_profit_distribution IN (0, 1)),
  escalation_status     TEXT NOT NULL DEFAULT 'pending',
  digital_signature     TEXT NOT NULL DEFAULT '',
  timestamp             TEXT NOT NULL
);
`;
