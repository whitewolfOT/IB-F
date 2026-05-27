import { runPipeline, PipelineError } from '../index';
import { createEvent } from '../../events';
import { ApprovalState } from '../../types';
import { SaleContract, PartnershipContract, SalamContract, IjarahContract, QardContract } from '../../contracts/schemas';
import { TransactionDescriptor } from '../../classification';

function makeApprovedEvent(linkedContractId: string) {
  const event = createEvent({
    location: 'Warehouse Dubai',
    event_type: 'goods_delivery',
    counterparties: ['party-a', 'party-b'],
    linked_contract_id: linkedContractId,
    asset_reference: 'asset-001',
    quantity: 100,
    unit: 'tons',
    supporting_documents: [],
    created_by: 'user-001',
  });
  (event as { approval_state: ApprovalState }).approval_state = ApprovalState.approved;
  return event;
}

const validMurabaha: SaleContract = {
  contract_id: 'ctr-murabaha-001',
  contract_type: 'murabaha',
  seller: 'seller-001',
  buyer: 'buyer-001',
  asset_description: 'Grade A Wheat',
  quantity: 100,
  unit: 'tons',
  quality_grade: 'A',
  purchase_cost: 8000,
  sale_price: 10000,
  currency: 'USD',
  delivery_date: '2026-06-01',
  delivery_location: 'Warehouse A',
  payment_schedule: [{ date: '2026-06-01', amount: 10000, currency: 'USD' }],
  title_transfer_rule: 'on_delivery',
  possession_status: 'in_possession',
  requires_cost_disclosure: true,
  requires_asset_ownership_before_sale: true,
  profit_must_be_fixed_and_known: true,
};

const murabahaDescriptor: TransactionDescriptor = {
  ownership_transfer: true,
  immediate_delivery: true,
  goods_standardized: false,
  manufactured_later: false,
  usufruct_transferred: false,
  single_capital_provider: false,
  labor_from_second_party: false,
  multiple_capital_providers: false,
  payment_timing: 'deferred',
  asset_fields_present: [
    'purchase_cost', 'ownership_transfer', 'immediate_delivery',
    'asset_description', 'sale_price', 'possession_status', 'requires_cost_disclosure',
  ],
};

const validMusharaka: PartnershipContract = {
  contract_id: 'ctr-musharaka-001',
  contract_type: 'musharaka',
  partners: ['partner-A', 'partner-B'],
  capital_contribution_by_partner: { 'partner-A': 60000, 'partner-B': 40000 },
  labor_contribution_by_partner: { 'partner-A': 'management', 'partner-B': 'operations' },
  profit_ratio_by_partner: { 'partner-A': 60, 'partner-B': 40 },
  loss_ratio_by_partner: { 'partner-A': 60, 'partner-B': 40 },
  management_authority: { 'partner-A': 'full', 'partner-B': 'limited' },
  liquidation_rules: 'Pro-rata capital distribution',
  negligence_rules: 'Negligent party bears full loss',
  withdrawal_rules: '30-day notice required',
};

const musharakaDescriptor: TransactionDescriptor = {
  ownership_transfer: false,
  immediate_delivery: false,
  goods_standardized: false,
  manufactured_later: false,
  usufruct_transferred: false,
  single_capital_provider: false,
  labor_from_second_party: false,
  multiple_capital_providers: true,
  payment_timing: 'deferred',
  asset_fields_present: [
    'multiple_capital_providers', 'profit_ratio_by_partner', 'loss_ratio_by_partner', 'capital_contribution',
  ],
};

describe('runPipeline - murabaha flow', () => {
  it('runs full murabaha pipeline: event approved → classified → validated → ledger posted', () => {
    const event = makeApprovedEvent(validMurabaha.contract_id);
    const result = runPipeline(event, validMurabaha, murabahaDescriptor);
    expect(result.classification.contract_type).toBe('murabaha');
    expect(result.violations).toHaveLength(0);
    // Two entries: purchase_cost (inventory) + profit (profit_distribution)
    expect(result.ledgerEntries).toHaveLength(2);
    expect(result.ledgerEntries[0].amount).toBe(8000); // purchase cost
    expect(result.ledgerEntries[1].amount).toBe(2000); // murabaha profit
  });

  it('throws PipelineError when event is not in approved state', () => {
    const event = createEvent({
      location: 'Warehouse Dubai',
      event_type: 'goods_delivery',
      counterparties: ['party-a', 'party-b'],
      linked_contract_id: validMurabaha.contract_id,
      asset_reference: 'asset-001',
      quantity: 100,
      unit: 'tons',
      supporting_documents: [],
      created_by: 'user-001',
    });
    expect(() => runPipeline(event, validMurabaha, murabahaDescriptor)).toThrow(PipelineError);
  });

  it('throws PipelineError when murabaha contract fails validation', () => {
    const event = makeApprovedEvent(validMurabaha.contract_id);
    const invalidContract: SaleContract = {
      ...validMurabaha,
      requires_cost_disclosure: false,
    };
    expect(() => runPipeline(event, invalidContract, murabahaDescriptor)).toThrow(PipelineError);
  });

  it('ledger entries for murabaha: cost entry debits receivables/credits inventory, profit entry debits receivables/credits profit_distribution', () => {
    const event = makeApprovedEvent(validMurabaha.contract_id);
    const result = runPipeline(event, validMurabaha, murabahaDescriptor);
    expect(result.ledgerEntries[0].debit_account).toBe('receivables');
    expect(result.ledgerEntries[0].credit_account).toBe('inventory');
    expect(result.ledgerEntries[1].debit_account).toBe('receivables');
    expect(result.ledgerEntries[1].credit_account).toBe('profit_distribution');
  });
});

describe('runPipeline - mudaraba/musharaka flow', () => {
  it('runs full musharaka pipeline: event approved → classified → validated → ledger posted', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = runPipeline(event, validMusharaka, musharakaDescriptor);
    expect(result.classification.contract_type).toBe('musharaka');
    expect(result.violations).toHaveLength(0);
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0].amount).toBe(100000); // 60000 + 40000
  });

  it('ledger entry for musharaka uses partnership_capital debit', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const result = runPipeline(event, validMusharaka, musharakaDescriptor);
    expect(result.ledgerEntries[0].debit_account).toBe('partnership_capital');
    expect(result.ledgerEntries[0].credit_account).toBe('receivables');
  });

  it('throws PipelineError when musharaka contract fails validation (guaranteed return)', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const invalidContract: PartnershipContract = {
      ...validMusharaka,
      guaranteed_return: true,
    };
    expect(() => runPipeline(event, invalidContract, musharakaDescriptor)).toThrow(PipelineError);
  });

  it('throws PipelineError when classification has violations', () => {
    const event = makeApprovedEvent(validMusharaka.contract_id);
    const badDescriptor: TransactionDescriptor = {
      ownership_transfer: false,
      immediate_delivery: false,
      goods_standardized: false,
      manufactured_later: false,
      usufruct_transferred: false,
      single_capital_provider: false,
      labor_from_second_party: false,
      multiple_capital_providers: false,
      payment_timing: 'deferred',
      asset_fields_present: [],
    };
    expect(() => runPipeline(event, validMusharaka, badDescriptor)).toThrow(PipelineError);
  });
});

describe('runPipeline - salam flow', () => {
  const validSalam: SalamContract = {
    contract_id: 'ctr-salam-001',
    contract_type: 'salam',
    buyer: 'buyer-001',
    seller: 'farmer-001',
    commodity_type: 'wheat',
    quantity: 500,
    quality_specification: 'Grade A, moisture < 12%',
    payment_amount: 5000,
    payment_timestamp: '2026-01-01T00:00:00Z',
    payment_completed: true,
    delivery_date: '2026-09-01',
    delivery_location: 'Warehouse Amman',
    commodity_specification_is_ambiguous: false,
  };
  const salamDescriptor: TransactionDescriptor = {
    ownership_transfer: true,
    immediate_delivery: false,
    goods_standardized: true,
    manufactured_later: false,
    usufruct_transferred: false,
    single_capital_provider: false,
    labor_from_second_party: false,
    multiple_capital_providers: false,
    payment_timing: 'immediate',
    asset_fields_present: ['ownership_transfer', 'payment_timing', 'goods_standardized', 'delivery_date', 'delivery_location', 'payment_amount'],
  };

  it('runs full salam pipeline and posts compliance_reserve debit', () => {
    const event = createEvent({
      location: 'Amman',
      event_type: 'payment_settlement',
      counterparties: ['buyer-001', 'farmer-001'],
      linked_contract_id: validSalam.contract_id,
      asset_reference: 'wheat-crop-2026',
      quantity: 5000,
      unit: 'USD',
      supporting_documents: [],
      created_by: 'user-001',
    });
    (event as { approval_state: ApprovalState }).approval_state = ApprovalState.approved;
    const result = runPipeline(event, validSalam, salamDescriptor);
    expect(result.classification.contract_type).toBe('salam');
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0].debit_account).toBe('compliance_reserve');
    expect(result.ledgerEntries[0].credit_account).toBe('payables');
    expect(result.ledgerEntries[0].amount).toBe(5000);
  });
});

describe('runPipeline - ijarah flow', () => {
  const validIjarah: IjarahContract = {
    contract_id: 'ctr-ijarah-001',
    contract_type: 'ijarah',
    lessor: 'lessor-001',
    lessee: 'lessee-001',
    leased_asset: 'Agricultural tractor model X300',
    lease_duration: 24,
    rent_schedule: [
      { date: '2026-02-01', amount: 800, currency: 'USD' },
      { date: '2026-03-01', amount: 800, currency: 'USD' },
    ],
    maintenance_obligations: 'Lessor responsible for major repairs',
  };
  const ijarahDescriptor: TransactionDescriptor = {
    ownership_transfer: false,
    immediate_delivery: false,
    goods_standardized: false,
    manufactured_later: false,
    usufruct_transferred: true,
    single_capital_provider: false,
    labor_from_second_party: false,
    multiple_capital_providers: false,
    payment_timing: 'installment',
    asset_fields_present: ['usufruct_transferred', 'leased_asset', 'lease_duration', 'rent_schedule', 'maintenance_obligations'],
  };

  it('runs full ijarah pipeline and posts receivables debit against profit_distribution', () => {
    const event = createEvent({
      location: 'Dubai',
      event_type: 'lease_activation',
      counterparties: ['lessor-001', 'lessee-001'],
      linked_contract_id: validIjarah.contract_id,
      asset_reference: 'tractor-x300',
      quantity: 800,
      unit: 'USD',
      supporting_documents: [],
      created_by: 'user-001',
    });
    (event as { approval_state: ApprovalState }).approval_state = ApprovalState.approved;
    const result = runPipeline(event, validIjarah, ijarahDescriptor);
    expect(result.classification.contract_type).toBe('ijarah');
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0].debit_account).toBe('receivables');
    expect(result.ledgerEntries[0].credit_account).toBe('profit_distribution');
    expect(result.ledgerEntries[0].amount).toBe(800);
  });
});

