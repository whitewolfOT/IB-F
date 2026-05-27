/**
 * Agricultural use cases from spec-core.md §15.
 * These are end-to-end scenario tests that exercise the full stack
 * (service layer + DB) for each Islamic contract type.
 */
import { IcosDb } from '../../db';
import { EventService } from '../../services/EventService';
import { ContractService } from '../../services/ContractService';
import { PipelineService } from '../../services/PipelineService';
import { SettlementService } from '../../services/SettlementService';
import { ApprovalState, OrgRole } from '../../types';
import {
  SalamContract,
  IjarahContract,
  PartnershipContract,
} from '../../contracts/schemas';
import { TransactionDescriptor } from '../../classification';
import { transition } from '../../approval';

function setup() {
  const db = new IcosDb(':memory:');
  return {
    db,
    events: new EventService(db),
    contracts: new ContractService(db),
    pipeline: new PipelineService(db),
    settlement: new SettlementService(db),
  };
}

function advanceToApproved(events: EventService, eventId: string): void {
  const steps: [ApprovalState, OrgRole][] = [
    [ApprovalState.submitted, OrgRole.operator],
    [ApprovalState.under_review, OrgRole.operator],
    [ApprovalState.operationally_verified, OrgRole.warehouse_manager],
    [ApprovalState.financially_verified, OrgRole.financial_controller],
    [ApprovalState.compliance_review, OrgRole.compliance_officer],
    [ApprovalState.approved, OrgRole.compliance_officer],
  ];
  for (const [newState, role] of steps) {
    events.transition(eventId, { newState, reviewer: 'reviewer-system', role, reason: `Advancing to ${newState}` });
  }
}

// ── §15: Salam — Crop Financing ─────────────────────────────────────────────
// Buyer prepays farmer. Farmer delivers wheat later. Quality and delivery date fixed.

describe('§15 Agricultural: Salam — Crop Financing', () => {
  it('buyer prepays farmer for wheat crop; advance is recorded as forward delivery obligation', () => {
    const { db, events, contracts, pipeline } = setup();

    const salamContract: SalamContract = {
      contract_id: 'salam-wheat-2026',
      contract_type: 'salam',
      buyer: 'grain-coop-001',
      seller: 'farmer-ibrahim-001',
      commodity_type: 'wheat',
      quantity: 10000,
      quality_specification: 'Grade A, moisture < 12%, protein > 12%, no weevils',
      payment_amount: 85000,
      payment_timestamp: '2026-01-15T08:00:00Z',
      payment_completed: true,
      delivery_date: '2026-07-01',
      delivery_location: 'Grain Warehouse, Amman, Jordan',
      commodity_specification_is_ambiguous: false,
    };

    contracts.register({
      contract_id: 'salam-wheat-2026',
      contract_type: 'salam',
      status: 'draft',
      shariah_score: null,
    });

    const event = events.create({
      location: 'Amman, Jordan',
      event_type: 'payment_settlement',
      counterparties: ['grain-coop-001', 'farmer-ibrahim-001'],
      linked_contract_id: 'salam-wheat-2026',
      asset_reference: 'wheat-crop-2026-jordan',
      quantity: 85000,
      unit: 'USD',
      supporting_documents: ['salam-contract-signed.pdf', 'payment-receipt.pdf'],
      created_by: 'procurement-officer-001',
    });

    advanceToApproved(events, event.event_id);

    const descriptor: TransactionDescriptor = {
      ownership_transfer: true,
      immediate_delivery: false,
      goods_standardized: true,
      manufactured_later: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      labor_from_second_party: false,
      multiple_capital_providers: false,
      payment_timing: 'immediate',
      asset_fields_present: [
        'ownership_transfer', 'payment_timing', 'goods_standardized',
        'delivery_date', 'delivery_location', 'payment_amount',
      ],
    };

    const result = pipeline.run(event.event_id, salamContract, descriptor);

    expect(result.classification.contract_type).toBe('salam');
    expect(result.classification.shariah_status).toBe('compliant');
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0].debit_account).toBe('compliance_reserve');
    expect(result.ledgerEntries[0].credit_account).toBe('payables');
    expect(result.ledgerEntries[0].amount).toBe(85000);
    expect(result.shariahReviewStub).toBeNull();

    // Verify entries persisted
    const detail = contracts.get('salam-wheat-2026');
    expect(detail.ledgerEntries).toHaveLength(1);
    expect(detail.ledgerEntries[0].amount).toBe(85000);

    db.close();
  });
});

// ── §15: Ijarah — Equipment Financing ───────────────────────────────────────
// Cooperative owns tractor. Farmer leases usage. Ownership stays with cooperative.

describe('§15 Agricultural: Ijarah — Equipment Financing', () => {
  it('cooperative leases tractor to farmer; first rent payment recorded as lease receivable', () => {
    const { db, events, contracts, pipeline } = setup();

    const ijarahContract: IjarahContract = {
      contract_id: 'ijarah-tractor-2026',
      contract_type: 'ijarah',
      lessor: 'agri-coop-001',
      lessee: 'farmer-yusuf-002',
      leased_asset: 'John Deere 6M Tractor — Serial: JD6M-2024-7731',
      lease_duration: 12,
      rent_schedule: [
        { date: '2026-02-01', amount: 1200, currency: 'USD' },
        { date: '2026-03-01', amount: 1200, currency: 'USD' },
        { date: '2026-04-01', amount: 1200, currency: 'USD' },
      ],
      maintenance_obligations: 'Lessor responsible for major mechanical repairs; lessee responsible for fuel and daily upkeep',
    };

    contracts.register({
      contract_id: 'ijarah-tractor-2026',
      contract_type: 'ijarah',
      status: 'draft',
      shariah_score: null,
    });

    const event = events.create({
      location: 'Northern Jordan Agricultural District',
      event_type: 'lease_activation',
      counterparties: ['agri-coop-001', 'farmer-yusuf-002'],
      linked_contract_id: 'ijarah-tractor-2026',
      asset_reference: 'jd6m-tractor-7731',
      quantity: 1200,
      unit: 'USD',
      supporting_documents: ['ijarah-contract.pdf', 'equipment-handover-receipt.pdf'],
      created_by: 'operations-manager-001',
    });

    advanceToApproved(events, event.event_id);

    const descriptor: TransactionDescriptor = {
      ownership_transfer: false,
      immediate_delivery: false,
      goods_standardized: false,
      manufactured_later: false,
      usufruct_transferred: true,
      single_capital_provider: false,
      labor_from_second_party: false,
      multiple_capital_providers: false,
      payment_timing: 'installment',
      asset_fields_present: [
        'usufruct_transferred', 'leased_asset', 'lease_duration',
        'rent_schedule', 'maintenance_obligations',
      ],
    };

    const result = pipeline.run(event.event_id, ijarahContract, descriptor);

    expect(result.classification.contract_type).toBe('ijarah');
    expect(result.classification.shariah_status).toBe('compliant');
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0].debit_account).toBe('receivables');
    expect(result.ledgerEntries[0].credit_account).toBe('profit_distribution');
    expect(result.ledgerEntries[0].amount).toBe(1200);

    db.close();
  });
});

// ── §15: Musharaka — Farmer–Investor Partnership ────────────────────────────
// Investor provides capital. Farmer provides labor, land, operations.
// Profit shared by agreement. Loss shared by capital ratio.

describe('§15 Agricultural: Musharaka — Farmer–Investor Partnership', () => {
  const musharakaContract: PartnershipContract = {
    contract_id: 'musharaka-greenhouse-2026',
    contract_type: 'musharaka',
    partners: ['investor-khalid-001', 'farmer-fatima-003'],
    capital_contribution_by_partner: {
      'investor-khalid-001': 120000,
      'farmer-fatima-003': 30000,
    },
    labor_contribution_by_partner: {
      'investor-khalid-001': 'capital only',
      'farmer-fatima-003': 'full operations: planting, irrigation, harvest, logistics',
    },
    profit_ratio_by_partner: {
      'investor-khalid-001': 60,
      'farmer-fatima-003': 40,
    },
    loss_ratio_by_partner: {
      'investor-khalid-001': 80,
      'farmer-fatima-003': 20,
    },
    management_authority: {
      'investor-khalid-001': 'strategic oversight only',
      'farmer-fatima-003': 'full operational management',
    },
    liquidation_rules: 'Assets sold at fair market value; proceeds distributed by capital ratio',
    negligence_rules: 'Partner responsible for losses caused by negligence bears full loss',
    withdrawal_rules: '90-day notice with partner buyout option at fair valuation',
  };

  it('capital contributions are recorded to partnership_capital subledger', () => {
    const { db, events, contracts, pipeline } = setup();

    contracts.register({
      contract_id: 'musharaka-greenhouse-2026',
      contract_type: 'musharaka',
      status: 'draft',
      shariah_score: null,
    });

    const event = events.create({
      location: 'Greenhouse Complex, Irbid, Jordan',
      event_type: 'partnership_funding',
      counterparties: ['investor-khalid-001', 'farmer-fatima-003'],
      linked_contract_id: 'musharaka-greenhouse-2026',
      asset_reference: 'greenhouse-complex-irbid-01',
      quantity: 150000,
      unit: 'USD',
      supporting_documents: ['musharaka-agreement.pdf', 'capital-transfer-confirmations.pdf'],
      created_by: 'financial-controller-001',
    });

    advanceToApproved(events, event.event_id);

    const descriptor: TransactionDescriptor = {
      ownership_transfer: false,
      immediate_delivery: false,
      goods_standardized: false,
      manufactured_later: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      labor_from_second_party: false,
      multiple_capital_providers: true,
      payment_timing: 'immediate',
      asset_fields_present: [
        'multiple_capital_providers', 'profit_ratio_by_partner',
        'loss_ratio_by_partner', 'capital_contribution',
      ],
    };

    const result = pipeline.run(event.event_id, musharakaContract, descriptor);

    expect(result.classification.contract_type).toBe('musharaka');
    expect(result.ledgerEntries[0].debit_account).toBe('partnership_capital');
    expect(result.ledgerEntries[0].amount).toBe(150000); // 120000 + 30000
    expect(result.shariahReviewStub).toBeNull();

    db.close();
  });

  it('profit settlement distributes to each partner by agreed ratio', () => {
    const { db, events, contracts, settlement } = setup();

    contracts.register({
      contract_id: 'musharaka-greenhouse-2026',
      contract_type: 'musharaka',
      status: 'approved',
      shariah_score: 100,
    });

    const event = events.create({
      location: 'Greenhouse Complex, Irbid, Jordan',
      event_type: 'payment_settlement',
      counterparties: ['investor-khalid-001', 'farmer-fatima-003'],
      linked_contract_id: 'musharaka-greenhouse-2026',
      asset_reference: 'greenhouse-complex-irbid-01',
      quantity: 40000,
      unit: 'USD',
      supporting_documents: ['harvest-accounts.pdf'],
      created_by: 'settlement-officer-001',
    });

    // Manually set to approved for settlement
    db.updateEventState(event.event_id, ApprovalState.approved);
    const stored = db.getEvent(event.event_id)!;
    (stored as { approval_state: string }).approval_state = ApprovalState.approved;

    // Satisfy the audit-trail compliance_review guard in SettlementService
    db.insertApprovalAuditEvent(transition({
      event: { ...event, approval_state: ApprovalState.financially_verified },
      newState: ApprovalState.compliance_review,
      reviewer: 'compliance-officer-001',
      role: OrgRole.compliance_officer,
      reason: 'Compliance review passed',
    }));

    const realizedProfit = 40000;
    const record = settlement.settle(event.event_id, musharakaContract, realizedProfit);

    expect(record.distributions['investor-khalid-001']).toBeCloseTo(24000); // 60%
    expect(record.distributions['farmer-fatima-003']).toBeCloseTo(16000);  // 40%
    expect(record.ledger_entries).toHaveLength(2);
    expect(record.final_state).toBe(ApprovalState.settled);

    // Both partners' distributions are in ledger entries
    const totalDistributed = record.ledger_entries.reduce((s, e) => s + e.amount, 0);
    expect(totalDistributed).toBeCloseTo(40000);

    db.close();
  });
});

// ── §15: Mudaraba — Agricultural Cooperative ────────────────────────────────
// Investors provide capital. Operators manage farming, logistics, distribution.

describe('§15 Agricultural: Mudaraba — Agricultural Cooperative', () => {
  it('investor capital contribution recorded; profit ratio validated (cannot guarantee return)', () => {
    const { db, events, contracts, pipeline } = setup();

    const mudarabaContract: PartnershipContract = {
      contract_id: 'mudaraba-coop-2026',
      contract_type: 'mudaraba',
      partners: ['investor-pool-001', 'coop-operator-001'],
      capital_contribution_by_partner: {
        'investor-pool-001': 200000,
        'coop-operator-001': 0,
      },
      labor_contribution_by_partner: {
        'investor-pool-001': 'capital only — no operational involvement',
        'coop-operator-001': 'full management: procurement, logistics, sales, distribution',
      },
      profit_ratio_by_partner: {
        'investor-pool-001': 70,
        'coop-operator-001': 30,
      },
      loss_ratio_by_partner: {
        'investor-pool-001': 100,
        'coop-operator-001': 0,
      },
      management_authority: {
        'investor-pool-001': 'none — silent investor (rab al-mal)',
        'coop-operator-001': 'absolute operational authority (mudarib)',
      },
      liquidation_rules: 'Capital returned to investor first; remaining profit split by ratio',
      negligence_rules: 'Mudarib bears loss caused by negligence or breach of mandate',
      withdrawal_rules: 'Capital withdrawal requires 6-month notice and audit completion',
    };

    contracts.register({
      contract_id: 'mudaraba-coop-2026',
      contract_type: 'mudaraba',
      status: 'draft',
      shariah_score: null,
    });

    const event = events.create({
      location: 'Agricultural Export Hub, Aqaba, Jordan',
      event_type: 'partnership_funding',
      counterparties: ['investor-pool-001', 'coop-operator-001'],
      linked_contract_id: 'mudaraba-coop-2026',
      asset_reference: 'coop-capital-tranche-1',
      quantity: 200000,
      unit: 'USD',
      supporting_documents: ['mudaraba-deed.pdf', 'wire-transfer-001.pdf'],
      created_by: 'financial-controller-001',
    });

    advanceToApproved(events, event.event_id);

    const descriptor: TransactionDescriptor = {
      ownership_transfer: false,
      immediate_delivery: false,
      goods_standardized: false,
      manufactured_later: false,
      usufruct_transferred: false,
      single_capital_provider: true,
      labor_from_second_party: true,
      multiple_capital_providers: false,
      payment_timing: 'immediate',
      asset_fields_present: [
        'single_capital_provider', 'labor_from_second_party',
        'profit_ratio_by_partner', 'capital_contribution',
      ],
    };

    const result = pipeline.run(event.event_id, mudarabaContract, descriptor);

    expect(result.classification.contract_type).toBe('mudaraba');
    expect(result.ledgerEntries[0].debit_account).toBe('partnership_capital');
    expect(result.ledgerEntries[0].amount).toBe(200000);

    // Mudaraba with guaranteed_return should be rejected
    const invalidMudaraba: PartnershipContract = { ...mudarabaContract, guaranteed_return: true };
    const event2 = events.create({
      location: 'Aqaba',
      event_type: 'partnership_funding',
      counterparties: ['investor-pool-001', 'coop-operator-001'],
      linked_contract_id: 'mudaraba-coop-2026',
      asset_reference: 'ref-002',
      quantity: 1000,
      unit: 'USD',
      supporting_documents: [],
      created_by: 'fc-001',
    });
    advanceToApproved(events, event2.event_id);
    expect(() => pipeline.run(event2.event_id, invalidMudaraba, descriptor))
      .toThrow(/guaranteed return is prohibited/);

    db.close();
  });
});
