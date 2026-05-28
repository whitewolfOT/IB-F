import { IIcosDb, DbContract } from '../db/interface';
import { LedgerEntry } from '../ledger';
import { ApprovalAuditEvent } from '../approval';
import { ComplianceFlag } from '../shariah';

export interface ContractDetail {
  contract: DbContract;
  ledgerEntries: LedgerEntry[];
  auditTrail: ApprovalAuditEvent[];
  complianceFlags: ComplianceFlag[];
  shariahReviews: unknown[];
}

export class ContractService {
  constructor(private readonly db: IIcosDb) {}

  register(params: Omit<DbContract, 'created_at' | 'updated_at'>): DbContract {
    const now = new Date().toISOString();
    const contract: DbContract = { ...params, created_at: now, updated_at: now };
    this.db.insertContract(contract);
    return contract;
  }

  updateStatus(contractId: string, status: string, shariahScore?: number): void {
    this.db.updateContractStatus(contractId, status, shariahScore);
  }

  get(contractId: string): ContractDetail {
    const contract = this.db.getContract(contractId);
    if (!contract) throw new Error(`Contract not found: ${contractId}`);
    return {
      contract,
      ledgerEntries: this.db.getLedgerEntriesForContract(contractId),
      auditTrail: this.db.getAuditTrail(contractId),
      complianceFlags: this.db.getComplianceFlagsForContract(contractId),
      shariahReviews: this.db.getShariahReviewsForContract(contractId),
    };
  }

  getLedgerEntries(contractId: string): LedgerEntry[] {
    return this.db.getLedgerEntriesForContract(contractId);
  }

  list(status?: string): DbContract[] {
    return this.db.listContracts(status);
  }
}
