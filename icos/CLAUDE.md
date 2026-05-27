# ICOS — Islamic Commercial Operating System

## What this system is
A contract-centered commercial operating system that reconnects finance to real
economic activity. Not accounting software. Not Islamic banking software. Not an ERP.
Every financial claim maps to a real economic event. Every obligation maps to a valid
contract. Every profit maps to measurable productive activity.

## Spec files — always check these before writing any code
- /docs/spec-core.md         — seven-layer architecture, contract taxonomy, formulas, ledger rules
- /docs/spec-approval.md     — approval state machine, Shariah review layer, compliance scoring
- /docs/session-prompts.md   — exact prompts for each build session in order

## Core ontological rule (non-negotiable)
Economic reality precedes accounting.
Every LedgerEntry MUST have: originating_event_id + linked_contract_id + counterparties.
No ledger entry may exist without all three. Hard constraint, not a guideline.

## Contract classification is computationally primary
Contract type determines: ledger treatment, risk rules, approval routing, settlement logic.
Never post to the ledger before contract_type is resolved and validated.
Canonical contract taxonomy is in /docs/spec-core.md §6. Do not invent types outside it.

## Approval state machine
13 canonical states. Every transition generates an immutable ApprovalAuditEvent.
Transitions are irreversible. Corrections require reversal events, not deletions.
Full state definitions in /docs/spec-approval.md §11.

## Shariah review is structured governance, not a flag
ShariahReviewRecord must include reasoning, cited principles, remediation steps.
ruling == non_compliant must automatically: freeze settlement + block profit distribution.
Overrides require ShariahOverrideEvent with multi-party approval. No silent bypasses.

## Balance invariant (hard)
sum(debits) == sum(credits) after every transaction. Typed error if violated.
Every function touching the ledger requires a balance assertion test.
Failing balance test = build blocker, not a warning.

## Build sequence
Follow the six sessions in /docs/session-prompts.md in order.
Do not skip ahead. Each session's output is the foundation for the next.

## Testing rules (from .claude/rules/testing.md)
See .claude/rules/testing.md
