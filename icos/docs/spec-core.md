# ICOS Foundational Specification — Core

## 1. Purpose

Build a Contract-Centered Commercial Operating System where:
- every financial claim maps to a real economic activity
- every obligation maps to a valid contract
- every profit maps to measurable productive activity
- every risk has identifiable ownership
- every ledger movement is mathematically balanced and auditable

Architecture inspired by: classical Islamic commercial law, historical Islamic trade and
treasury systems, AAOIFI standards, modern accounting systems, distributed infrastructure.

System properties: Asset-backed · Contract-aware · Risk-aware · Audit-traceable · Real-economy centered

---

## 2. Foundational Principles

**Principle 1 — Economic Reality Precedes Accounting**
The system begins with goods, labor, services, ownership, obligations, and risk.
Accounting entries are representations of real events. Never treat abstractions as primary.

**Principle 2 — Contracts Define Meaning**
The same monetary movement may represent a sale, lease, agency, partnership, or loan.
Contract classification is computationally primary.

**Principle 3 — Risk Must Remain Attached to Ownership**
Preserve continuity between ownership, responsibility, profit, and loss.
Risk cannot be detached from underlying economic exposure.

**Principle 4 — Finance Serves Production**
Finance exists to facilitate trade, allocate capital, coordinate production, manage settlement.
Not an independent speculative layer.

---

## 3. Seven-Layer Architecture

1. Event Layer
2. Contract Classification Layer
3. Measurement Layer
4. Ledger Layer
5. Compliance Layer
6. Risk Layer
7. Settlement Layer

---

## 4. Event Layer

Records real-world economic activity: delivery of goods, ownership transfer, warehouse intake,
partnership funding, agency execution, transport completion, payment settlement, spoilage,
inventory loss, lease activation.

```
Event {
  event_id
  timestamp
  location
  event_type
  counterparties
  linked_contract_id
  asset_reference
  quantity
  unit
  supporting_documents
  created_by
  approval_state
}
```

**Design Rule:** All downstream accounting, valuation, compliance, and settlement must
originate from recorded economic events. No ledger entry without an originating economic event.

---

## 5. Contract Classification Layer

Determines: legal-commercial structure, applicable rules, ownership model, risk allocation,
settlement logic. Classifies by economic substance, not labels.

---

## 6. Canonical Contract Taxonomy

### 6A. Sale Contracts
**Purpose:** Transfer ownership in exchange for consideration.
**Types:** spot_sale · murabaha · deferred_payment_sale

Required conditions: asset exists, seller possesses/owns asset, price known,
quantity known, delivery conditions known, payment conditions known.

```
SaleContract {
  seller
  buyer
  asset_description
  quantity
  unit
  quality_grade
  purchase_cost
  sale_price
  currency
  delivery_date
  delivery_location
  payment_schedule
  title_transfer_rule
  possession_status
}
```

Murabaha-specific rules:
- requires_cost_disclosure = true
- requires_asset_ownership_before_sale = true
- profit_must_be_fixed_and_known = true

### 6B. Salam Contracts
**Purpose:** Advance payment for standardized goods delivered later.
**Types:** salam · parallel_salam

Required conditions: full payment upfront, precise specification, quantity fixed,
quality fixed, delivery date fixed, delivery location fixed.

```
SalamContract {
  buyer
  seller
  commodity_type
  quantity
  quality_specification
  payment_amount
  payment_timestamp
  delivery_date
  delivery_location
}
```

Validation rules:
- if payment_completed != true → reject_contract
- if commodity_specification_is_ambiguous → reject_contract

### 6C. Istisna Contracts
**Purpose:** Manufacturing or construction contracts.
**Types:** istisna · parallel_istisna

Required conditions: manufactured asset specified, production milestones defined,
delivery requirements defined, pricing model defined.

```
IstisnaContract {
  manufacturer
  purchaser
  asset_specification
  milestone_schedule
  delivery_requirements
  payment_schedule
  completion_conditions
}
```

### 6D. Partnership Contracts
**Purpose:** Shared investment and/or management structures.
**Types:** mudaraba · musharaka

Mudaraba: one party provides capital, another provides labor/management,
profit shared by agreed ratio, losses allocated by capital exposure unless negligence.

Musharaka: multiple parties contribute capital, share profit and loss by contract rules.

```
PartnershipContract {
  partners
  capital_contribution_by_partner
  labor_contribution_by_partner
  profit_ratio_by_partner
  loss_ratio_by_partner
  management_authority
  liquidation_rules
  negligence_rules
  withdrawal_rules
}
```

Validation rules:
- sum(profit_ratios) == 100%
- if guaranteed_return_exists → reject_contract

### 6E. Lease Contracts
**Purpose:** Transfer usufruct rather than ownership.
**Types:** ijarah · ijarah_muntahia_bittamleek

Required conditions: leased asset identified, lease duration specified, rent schedule
specified, maintenance responsibility specified, ownership status clear.

```
IjarahContract {
  lessor
  lessee
  leased_asset
  lease_duration
  rent_schedule
  maintenance_obligations
  ownership_transfer_conditions
}
```

### 6F. Agency Contracts
**Purpose:** One party acts on behalf of another.
**Types:** wakala · wakala_bi_al_istithmar

```
AgencyContract {
  principal
  agent
  authorized_scope
  fee_structure
  reimbursement_policy
  reporting_requirements
  revocation_rules
}
```

### 6G. Qard Contracts
**Purpose:** Benevolent loans.
**Types:** qard

Required conditions: repayment amount fixed, no guaranteed excess, no hidden return.

```
QardContract {
  lender
  borrower
  principal_amount
  repayment_schedule
  collateral_if_any
}
```

### 6H. Supporting Legal Instruments (linked objects, not primary contracts)
Types: waad · khiyar · zakat_obligation · non_compliance_event · risk_reserve

---

## 7. Contract Classification Logic

Inference inputs: ownership structure, delivery timing, payment timing, manufacturing status,
profit allocation, agency structure, asset transfer characteristics.

Example logic:
```
if payment_now && delivery_later && goods_standardized → classify_as_salam
if capital_from_one_party && labor_from_another → classify_as_mudaraba
if usufruct_transferred_without_title_transfer → classify_as_ijarah
```

### 7A. Classification Tree
```
Is ownership transferred?
├── Yes
│   ├── Immediate delivery?
│   │   ├── Yes → Bay' / Murabaha
│   │   └── No → Salam
│   └── Manufactured later?
│       └── Yes → Istisna
└── No
    ├── Asset usage transferred?
    │   └── Yes → Ijarah
    └── Capital partnership?
        ├── One invests, one manages → Mudarabah
        └── Multiple capital providers → Musharakah
```

### 7B. Required Engine Output
```json
{
  "contract_type": "murabaha",
  "shariah_status": "compliant",
  "violations": [],
  "risk_flags": [],
  "required_missing_fields": [],
  "confidence_score": 0.97
}
```

Confidence score formula:
- score = (present required fields / total required fields for that type)
- × 1.0 if single unambiguous path matched
- × 0.7 if two paths matched
- × 0.5 if fallback/ambiguous

---

## 8. Measurement Layer

Converts economic events into measurable financial values. Derives values from:
quantity, price, cost, quality, risk, spoilage, settlement conditions.

---

## 9. Financial Formulas

All calculations must be: contract-aware · asset-aware · event-linked · audit-reproducible.

### 9A. Asset Valuation
```
Asset Value = Quantity × Unit Price × Quality Adjustment
```
Example: 1000 kg wheat × 1.2 price × 0.95 quality = 1140

### 9B. Murabaha Profit
```
Murabaha Profit = Sale Price − Purchase Cost
Profit Margin = (Sale Price − Purchase Cost) / Purchase Cost
```
Rules: purchase cost must be known, profit fixed, no floating interest benchmark,
ownership must exist before resale.

### 9C. Partnership Profit Allocation
```
Partner Share = Realized Profit × Profit Ratio
Loss Share = Total Loss × Capital Exposure Ratio
```
Rules: ratios total 100%, profit ratios may differ from capital ratios,
loss ratios must follow capital exposure unless negligence.

### 9D. Inventory Spoilage
```
Spoilage Loss = Spoiled Quantity × Unit Cost
Net Inventory Value = Gross Inventory Value − Spoilage Loss
```

### 9E. Salam Exposure
```
Outstanding Salam Exposure = Contract Quantity − Delivered Quantity
Exposure Value = Outstanding Quantity × Reference Market Price
```

### 9F. Lease Revenue
```
Earned Lease Revenue = Lease Payment Rate × Elapsed Lease Time
Unearned Lease Liability = Collected Lease Payments − Earned Lease Revenue
```

### 9G. Working Capital
```
Working Capital = Current Assets − Current Liabilities
```

### 9H. Risk Reserve
```
Risk Reserve Requirement = Risk Exposure × Reserve Ratio
```
Inputs: spoilage probability, delivery failure probability, counterparty reliability,
transport instability, commodity volatility.

### 9I. Net Real Economic Profit
```
Net Real Profit = Revenue − Operational Costs − Asset Losses − Settlement Losses
```
Distinguish: realized profit vs unrealized valuation vs expected future revenue vs estimates.
Only realized productive profit enters distributable profit pools.

---

## 10. Ledger Layer

Converts classified economic events into balanced accounting entries, ownership records,
liability states, settlement states, and audit history.

The ledger is: event-derived · immutable after finalization · contract-linked.

No ledger entry may exist independently of: originating event + recognized contract + counterparties.

```
LedgerEntry {
  entry_id
  timestamp
  originating_event_id
  linked_contract_id
  debit_account
  credit_account
  amount
  currency
  asset_reference
  created_by
  approval_state
  audit_hash
}
```

**Double-entry enforcement:** sum(debits) == sum(credits). Reject if violated.

**Contract-aware posting logic:**
- murabaha profit → trade income account
- ijarah payment → lease revenue account
- mudaraba capital → investment capital account
- qard repayment → liability reduction
- salam advance payment → forward delivery obligation

---

## 11. Validation Engine

### 11A. Riba Detection
| Violation | Detection Logic |
|---|---|
| Guaranteed fixed return in partnership | Fixed ROI in Musharakah/Mudarabah |
| Interest-bearing loan | Loan + mandatory increase |
| Compounding debt | Debt increasing over time automatically |
| Money for money unequally | Currency exchange mismatch |
| Penalty profit | Creditor benefiting from late fees |

### 11B. Gharar Detection
| Violation | Detection Logic |
|---|---|
| Undefined asset | Missing specifications |
| Unknown delivery | No date/location |
| Unclear ownership | Seller lacks possession |
| Ambiguous pricing | Variable undefined price |
| Excessive uncertainty | Key contract terms absent |

### 11C. Maysir Detection
| Violation | Detection Logic |
|---|---|
| Zero-sum speculation | Pure betting exposure |
| Random payout dependency | Outcome solely luck-based |
| Synthetic leverage gambling | No underlying real asset |

---

## 12. Compliance Scoring

| Rule | Weight |
|---|---|
| No Riba | 40 |
| No Gharar | 25 |
| Asset-backed | 15 |
| Ownership Validity | 10 |
| Proper Risk Sharing | 10 |

Score bands: 100 = Fully Compliant · 70–99 = Minor Issues · 40–69 = Serious Concerns · 0–39 = Non-Compliant

---

## 13. Database Schema

**Contracts:** contract_id (UUID), contract_type (ENUM), status (ENUM),
created_at (TIMESTAMP), updated_at (TIMESTAMP), shariah_score (INTEGER)

**Parties:** party_id (UUID), name (TEXT), role (ENUM), country (TEXT), verification_status (BOOLEAN)

**Assets:** asset_id (UUID), asset_type (ENUM), ownership_status (ENUM), valuation (DECIMAL), description (TEXT)

**Compliance Flags:** flag_id (UUID), contract_id (UUID), violation_type (ENUM), severity (ENUM), notes (TEXT)

---

## 14. Prohibited Industries Filter

Reject contracts involving: alcohol · gambling · pornography · interest-based banking ·
fraud · prohibited food products · exploitative industries · speculative financial derivatives

---

## 15. Agricultural Use Cases

### Salam — Crop Financing
Buyer prepays farmer. Farmer delivers crops later. Quality and delivery date fixed.
Suitable for: wheat, barley, olives, dates, tomatoes, potatoes, livestock feed.

### Ijarah — Equipment Financing
Cooperative buys tractor. Farmer leases usage. Ownership remains with lessor.
Suitable assets: tractors, irrigation, cold storage, greenhouses, transport.

### Musharaka — Farmer–Investor Partnership
Investor: capital. Farmer: labor, land, operations. Profit: shared by agreement.
Loss: shared by capital ratio. Suitable for: greenhouses, hydroponics, olive groves, livestock.

### Mudaraba — Cooperative
Investors provide capital. Operators manage farming, logistics, distribution, processing.
Suitable for: food processing, distribution hubs, agricultural marketplaces, export.

---

## 16. Final Architectural Principle

The system must not imitate conventional banking with Islamic terminology layered on top.
The architecture itself must operate on: ownership, trade, shared risk, real assets,
productive economic activity, transparency, accountability.

A contract is not Islamic merely because terminology changes.
Its underlying economic substance, risk structure, ownership flow, and legal reality
must comply with Shariah principles.
