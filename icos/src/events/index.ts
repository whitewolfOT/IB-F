import { v4 as uuidv4 } from 'uuid';
import { ApprovalState } from '../types';

export type EventType =
  | 'goods_delivery'
  | 'ownership_transfer'
  | 'warehouse_intake'
  | 'partnership_funding'
  | 'agency_execution'
  | 'transport_completion'
  | 'payment_settlement'
  | 'spoilage'
  | 'inventory_loss'
  | 'lease_activation';

export interface IcosEvent {
  event_id: string;
  timestamp: string;
  location: string;
  event_type: EventType;
  counterparties: string[];
  linked_contract_id: string;
  asset_reference: string;
  quantity: number;
  unit: string;
  supporting_documents: string[];
  created_by: string;
  approval_state: ApprovalState;
}

export class EventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

export type CreateEventParams = Omit<IcosEvent, 'event_id' | 'timestamp' | 'approval_state'>;

export function createEvent(params: CreateEventParams): IcosEvent {
  if (!params.linked_contract_id) throw new EventValidationError('linked_contract_id is required');
  if (!params.counterparties || params.counterparties.length === 0) throw new EventValidationError('counterparties are required');
  return {
    ...params,
    event_id: uuidv4(),
    timestamp: new Date().toISOString(),
    approval_state: ApprovalState.draft,
  };
}
