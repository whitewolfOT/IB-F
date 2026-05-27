# ICOS Build Sessions — Exact Prompts

Run these in order. Each session builds on the previous.
Do not skip ahead. Do not combine sessions.

---

## Session 1 — Double-entry accounting engine

Paste this prompt into Claude Code:

---
Build a double-entry accounting engine in TypeScript.

Use this exact LedgerEntry schema from /docs/spec-core.md §10:
- entry_id, timestamp, originating_event_id, linked_contract_id
- debit_account, credit_account, amount, currency
- asset_reference, created_by, approval_state, audit_hash

Requirements:
1. Enforce sum(debits) == sum(credits) on every transaction — throw a typed error if violated
2. Implement these subledger types as a TypeScript enum:
   inventory | receivables | payables | partnership_capital |
   profit_distribution | zakat | waqf | agency_fee | compliance_reserve
3. Write unit tests for:
   - balance invariant (pass case and fail case)
   - posting to each subledger type
   - a multi-entry transaction with three legs

No business logic yet. Pure accounting mechanics only.
---

---

## Session 2 — Nine financial formulas as pure functions

Paste this prompt into Claude Code:

---
Implement the nine financial formulas from /docs/spec-core.md §9 as pure TypeScript
functions with typed inputs and outputs.

For each function:
- Throw a typed error on invalid inputs (negative quantities, ratios not summing to 100%, etc.)
- Write at least two unit tests: one valid case, one edge/invalid case

Functions to implement:
1. assetValuation(quantity, unitPrice, qualityAdjustment) — §9A
2. murabahaProfit(salePrice, purchaseCost) — §9B
3. partnershipProfitAllocation(realizedProfit, profitRatios) — §9C
4. partnershipLossAllocation(totalLoss, capitalExposureRatios) — §9C
5. inventorySpoilage(spoiledQuantity, unitCost, grossInventoryValue) — §9D
6. salamExposure(contractQuantity, deliveredQuantity, referenceMarketPrice) — §9E
7. leaseRevenue(leasePaymentRate, elapsedLeaseTime, collectedPayments) — §9F
8. workingCapital(currentAssets, currentLiabilities) — §9G
9. riskReserveRequirement(riskExposure, reserveRatio) — §9H
10. netRealProfit(revenue, operationalCosts, assetLosses, settlementLosses) — §9I

No database, no events, no contracts. Pure math functions only.
---

---

## Session 3 — Contract schemas and validators

Paste this prompt into Claude Code:

---
Implement TypeScript types and validator functions for all seven ICOS contract families
from /docs/spec-core.md §6.

For each contract type:
1. A TypeScript interface matching the spec schema exactly
2. A validate(contract) function returning { valid: boolean, violations: string[] }
   implementing ALL rejection rules from the spec

Contract families to implement:
- SaleContract (including murabaha-specific rules: cost disclosure, ownership before sale,
  fixed profit) — §6A
- SalamContract (full payment check, specification ambiguity check) — §6B
- IstisnaContract — §6C
- PartnershipContract (mudaraba + musharaka: profit ratios sum to 100%,
  no guaranteed return) — §6D
- IjarahContract — §6E
- AgencyContract — §6F
- QardContract (no guaranteed excess, no hidden return) — §6G

For each contract type write:
- One test with all required fields present and valid (should pass)
- One test per rejection rule that should trigger (should fail with correct violation message)

Also implement the prohibited industries filter from §14 as a separate validator.
---

---

## Session 4 — Classification engine

Paste this prompt into Claude Code:

---
Implement the contract classification engine from /docs/spec-core.md §7.

Input: a raw transaction descriptor object with these fields:
  ownership_transfer: boolean
  immediate_delivery: boolean
  goods_standardized: boolean
  manufactured_later: boolean
  usufruct_transferred: boolean
  single_capital_provider: boolean
  labor_from_second_party: boolean
  multiple_capital_providers: boolean
  payment_timing: 'immediate' | 'deferred' | 'installment'
  asset_fields_present: string[]   // list of field names provided

Output (from spec §7B):
{
  contract_type: string
  shariah_status: 'compliant' | 'requires_review' | 'non_compliant'
  violations: string[]
  risk_flags: string[]
  required_missing_fields: string[]
  confidence_score: number
}

Confidence score formula:
  base = present_required_fields / total_required_fields_for_contract_type
  multiplier = 1.0 if single unambiguous path matched
             = 0.7 if two paths matched
             = 0.5 if fallback/ambiguous
  confidence_score = base × multiplier

Classification tree is in /docs/spec-core.md §7A.
Write tests for every branch of the decision tree.
---

---

## Session 5 — Event intake, approval state machine, full pipeline

Paste this prompt into Claude Code:

---
Build three connected systems using specs in /docs/spec-core.md and /docs/spec-approval.md.

SYSTEM 1 — Event intake
Implement the Event type from spec §4. Create function initializes approval_state to 'draft'.
All fields required. Validate that linked_contract_id and counterparties are present.

SYSTEM 2 — Approval state machine
- Implement all 13 states from /docs/spec-approval.md §11B as a TypeScript enum
- Implement transition rules from §11E as a transition function
- Implement the authority matrix from §11F (approval required by role per condition)
- Implement multi-signature requirements from §11G
- Generate an immutable ApprovalAuditEvent (schema §11H) on EVERY transition
- Transitions are irreversible. Throw if an invalid transition is attempted.

SYSTEM 3 — Full pipeline
When an event reaches 'approved' state:
1. Run the classifier (Session 4 output)
2. Run the appropriate contract validator (Session 3 output)
3. Compute values using the relevant formulas (Session 2 output)
4. Post to the ledger (Session 1 output) with contract-aware posting logic from spec §10:
   - murabaha profit → trade_income subledger
   - ijarah payment → lease_revenue (map to appropriate subledger)
   - mudaraba capital → partnership_capital subledger
   - qard repayment → payables reduction
   - salam advance → compliance_reserve (forward delivery obligation)

Write integration tests for two complete pipeline runs:
1. A murabaha sale: event created → approved → classified → validated → ledger posted
2. A mudaraba capital contribution: same full flow
---

---

## Session 6 — Shariah review layer, compliance scoring, settlement

Paste this prompt into Claude Code:

---
Build three final systems using /docs/spec-approval.md §12 and /docs/spec-core.md §12.

SYSTEM 1 — Shariah review layer
- ShariahReviewer type (§12B) with madhhab_specialization enum:
  Hanafi | Maliki | Shafii | Hanbali | Jafari | Other
- ShariahReviewRecord (§12C)
- Ruling type with all seven ruling states (§12D) and full Ruling structure (§12E)
- EvidenceReference (§12F)
- ShariahOverrideEvent (§12H) requiring multi-party authorization array

Auto-trigger logic (§12A): when classifier returns risk_flags or shariah_review in
approval_state, automatically generate a ShariahReviewRecord stub.

Non-compliance handling (§12G): ruling == non_compliant must:
  - freeze_settlement (block any settlement function calls)
  - block_profit_distribution (throw if distribution attempted)
  - generate_noncompliance_case (create a compliance flag record)

Override governance: ShariahOverrideEvent requires minimum 2 authorizing_entities.
System must throw if override attempted with < 2 authorizers.

SYSTEM 2 — Compliance scoring
Implement the weighted compliance score from /docs/spec-core.md §12:
  No Riba: 40 | No Gharar: 25 | Asset-backed: 15 |
  Ownership Validity: 10 | Proper Risk Sharing: 10
Return score (0–100) + band: Fully Compliant | Minor Issues | Serious Concerns | Non-Compliant

SYSTEM 3 — Settlement layer
- Compute partner distributions using formulas from Session 2 (§9C)
- Validate all required approval states are 'approved' before settling
- Post final settlement entries to ledger
- Transition event to 'settled' state
- Generate final settlement audit record

Write tests for: non-compliant ruling blocking settlement,
override requiring 2 authorizers, full settlement of a musharaka partnership.
---
