# ICOS Specification — Approval & Shariah Review Layer

## 11. Approval State & Organizational Control Layer

The approval system governs: economic authorization, operational validation,
compliance escalation, and ledger finalization.

This is not merely technical permissioning. It represents: accountability,
delegated authority, separation of duties, and institutional trust structure.

### 11A. Approval State Field
Every event and contract object contains `approval_state`.

### 11B. Canonical Approval States
```
draft
submitted
under_review
operationally_verified
financially_verified
compliance_review
shariah_review
approved
rejected
returned_for_revision
suspended
settled
archived
```

### 11C. State Definitions
| State | Meaning |
|---|---|
| draft | Created but not formally submitted |
| submitted | Submitted into workflow |
| under_review | Awaiting institutional review |
| operationally_verified | Real-world event confirmed |
| financially_verified | Financial values validated |
| compliance_review | Compliance/risk review in progress |
| shariah_review | Requires Shariah review/escalation |
| approved | Authorized for ledger finalization |
| rejected | Invalid or prohibited |
| returned_for_revision | Requires correction |
| suspended | Temporarily frozen due to dispute/risk |
| settled | Fully completed economically |
| archived | Closed historical record |

### 11D. Organizational Approval Roles
- operator
- warehouse_manager
- procurement_officer
- financial_controller
- risk_officer
- compliance_officer
- shariah_reviewer
- senior_shariah_board
- auditor
- settlement_officer

System must support: delegated authority · multi-signature approval ·
threshold escalation · role separation.

### 11E. Approval Transition Logic
```
if event_created → transition_to(submitted)
if warehouse_receipt_confirmed → transition_to(operationally_verified)
if financial_values_validated → transition_to(financially_verified)
if contract_requires_shariah_escalation → transition_to(shariah_review)
if all_required_reviews_complete → transition_to(approved)
if material_noncompliance_detected → transition_to(rejected)
if dispute_detected → transition_to(suspended)
```

### 11F. Approval Authority Matrix
| Condition | Required Approver |
|---|---|
| Small inventory transfer | warehouse_manager |
| Large capital deployment | financial_controller |
| Novel contract structure | senior_shariah_board |
| High-risk counterparty | risk_officer |
| Zakat calculation dispute | compliance_officer |
| Parallel salam chain | shariah_reviewer |

### 11G. Multi-Signature Requirements
```
murabaha_over_threshold:
  requires:
    - operational_approval
    - financial_approval
    - shariah_approval
```
System must support: sequential approvals · parallel approvals ·
quorum requirements · escalation paths.

### 11H. Immutable Approval Audit Trail
Every approval action generates an immutable audit event. Never deletable after finalization.
Corrections require reversal events + superseding approvals + preserved history.

```
ApprovalAuditEvent {
  audit_event_id
  timestamp
  related_object_id
  reviewer_entity
  reviewer_role
  prior_state
  new_state
  decision
  decision_reason
  supporting_documents
  digital_signature
}
```

---

## 12. Shariah Review & Ruling Layer

Governs: jurisprudential validation, non-compliance detection, exception handling,
institutional religious oversight.

Shariah review is NOT a binary checkbox or simple flag.
It is a structured governance process with: evidence, reasoning,
reviewer accountability, and legal-commercial interpretation.

### 12A. Shariah Review Triggers
Review triggered by: unusual contract structures, mixed contracts, high uncertainty,
disputed ownership, late delivery conditions, penalty clauses, currency conversion
structures, derivative-like exposure, regulatory escalation.

```
if contract_pattern_not_recognized → escalate_to_shariah_review
if prohibited_clause_detected → escalate_to_shariah_review
if risk_structure_exceeds_policy → escalate_to_shariah_review
```

### 12B. Shariah Reviewer Entity
Reviewer types: internal_shariah_reviewer · external_shariah_advisor ·
shariah_board_member · senior_faqih · institutional_shariah_committee

```
ShariahReviewer {
  reviewer_id
  name
  credentials
  madhhab_specialization   // Hanafi | Maliki | Shafii | Hanbali | Jafari | Other
  jurisdiction
  authorization_scope
  appointment_period
  active_status
}
```

### 12C. Shariah Review Record
```
ShariahReviewRecord {
  review_id
  timestamp
  related_contract_id
  related_event_ids
  reviewer_id
  triggering_reason
  submitted_documents
  detected_issues
  evidentiary_basis
  legal_reasoning
  ruling
  ruling_confidence
  required_remediation
  followup_requirements
  escalation_status
  digital_signature
}
```

### 12D. Canonical Ruling States
```
compliant
conditionally_compliant
non_compliant
requires_modification
requires_escalation
pending_additional_information
suspended_pending_review
```

### 12E. Ruling Structure
A ruling must include legal reasoning, cited principles, identified violations,
remediation requirements. NOT merely "halal" or "haram".

```
Ruling {
  ruling_type                 // from 12D
  violated_principles
  cited_standards
  reasoning_summary
  remediation_steps
  effective_scope             // contract-specific | contract-type-wide | global
  expiration_conditions       // date-based | supersession-only | never
  override_permissions
}
```

### 12F. Evidence & Citation Layer
```
EvidenceReference {
  reference_type
  source_title
  section_reference
  quotation_excerpt
  applicability_scope
}
```
Supports linkage to: AAOIFI standards · institutional policy · fiqh references ·
regulatory standards · prior rulings.

### 12G. Non-Compliance Handling
```
if ruling == non_compliant:
  freeze_settlement
  block_profit_distribution
  generate_noncompliance_case
```
System may also: reverse ledger eligibility · isolate profits ·
create purification obligations · escalate governance review.

### 12H. Override Governance
Overrides must be extremely restricted.
```
ShariahOverrideEvent {
  override_id
  overridden_ruling_id
  authorizing_entities        // requires multi-party
  justification
  risk_acknowledgment
  timestamp
  expiration_conditions
}
```
System must NEVER silently bypass: compliance controls · Shariah rulings · audit requirements.
