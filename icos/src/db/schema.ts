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
  timestamp             TEXT NOT NULL,
  ruling_json           TEXT
);

CREATE TABLE IF NOT EXISTS shariah_override_events (
  override_id           TEXT PRIMARY KEY,
  overridden_ruling_id  TEXT NOT NULL REFERENCES shariah_review_records(review_id),
  authorizing_entities  TEXT NOT NULL,
  justification         TEXT NOT NULL,
  risk_acknowledgment   TEXT NOT NULL,
  expiration_conditions TEXT NOT NULL,
  timestamp             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supporting_instruments (
  instrument_id         TEXT PRIMARY KEY,
  instrument_type       TEXT NOT NULL CHECK (instrument_type IN (
    'waad','khiyar','zakat_obligation','risk_reserve','non_compliance_event'
  )),
  linked_contract_id    TEXT NOT NULL REFERENCES contracts(contract_id),
  data_json             TEXT NOT NULL,
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
    'operator','warehouse_manager','procurement_officer','financial_controller',
    'risk_officer','compliance_officer','shariah_reviewer','senior_shariah_board',
    'auditor','settlement_officer','counterparty','system'
  )),
  party_id      TEXT REFERENCES parties(party_id),
  is_master     INTEGER NOT NULL DEFAULT 0 CHECK (is_master IN (0, 1)),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(user_id),
  token_hash    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  revoked       INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1))
);

CREATE TABLE IF NOT EXISTS system_config (
  config_key    TEXT PRIMARY KEY,
  config_value  TEXT NOT NULL,
  value_type    TEXT NOT NULL CHECK (value_type IN ('number', 'string', 'json', 'array')),
  description   TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config_proposals (
  proposal_id    TEXT PRIMARY KEY,
  config_key     TEXT NOT NULL,
  current_value  TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  proposed_by    TEXT NOT NULL REFERENCES users(user_id),
  proposed_at    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'ratified', 'rejected')),
  decided_by     TEXT REFERENCES users(user_id),
  decided_at     TEXT,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS exception_requests (
  exception_id       TEXT PRIMARY KEY,
  exception_type     TEXT NOT NULL CHECK (exception_type IN (
    'compliance_exception', 'shariah_override_request', 'prohibited_industry_dispute'
  )),
  event_id           TEXT NOT NULL REFERENCES events(event_id),
  submitter_id       TEXT NOT NULL REFERENCES users(user_id),
  grounds            TEXT NOT NULL,
  scope              TEXT NOT NULL CHECK (scope IN (
    'this_event', 'this_contract_type', 'this_counterparty'
  )),
  disputed_criterion TEXT,
  disputed_match     TEXT,
  supporting_docs    TEXT NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'withdrawn'
  )),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exception_decisions (
  decision_id            TEXT PRIMARY KEY,
  exception_id           TEXT NOT NULL REFERENCES exception_requests(exception_id),
  decided_by             TEXT NOT NULL REFERENCES users(user_id),
  decision               TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes                  TEXT NOT NULL,
  decided_at             TEXT NOT NULL,
  step                   INTEGER NOT NULL DEFAULT 1,
  total_steps_required   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS upload_records (
  file_id       TEXT PRIMARY KEY,
  filename      TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  uploaded_by   TEXT NOT NULL REFERENCES users(user_id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aaoifi_standards (
  standard_id   TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shariah_reviewers (
  reviewer_id              TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(user_id),
  full_name                TEXT NOT NULL,
  credentials              TEXT NOT NULL,
  madhhab                  TEXT NOT NULL CHECK (madhhab IN (
    'Hanafi','Maliki','Shafii','Hanbali','Jafari','Other'
  )),
  jurisdiction             TEXT NOT NULL,
  appointment_period_start TEXT NOT NULL,
  appointment_period_end   TEXT NOT NULL,
  active                   INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migrations (
  migration_id  TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  ran_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_log (
  log_id        TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(user_id),
  action        TEXT NOT NULL CHECK (action IN (
    'read_ruling', 'read_legal_reasoning', 'read_audit_trail',
    'read_override', 'read_compliance_flag', 'export_pdf'
  )),
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  accessed_at   TEXT NOT NULL
);
`;

// Applied with try-catch on every startup (SQLite errors if column already exists).
export const MIGRATION_SQL = [
  'ALTER TABLE shariah_review_records ADD COLUMN draft_reasoning TEXT',
  'ALTER TABLE shariah_review_records ADD COLUMN draft_updated_at TEXT',
];
