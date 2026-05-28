import { OrgRole } from '../types';

export type ExceptionType =
  | 'compliance_exception'
  | 'shariah_override_request'
  | 'prohibited_industry_dispute';

export type ExceptionScope =
  | 'this_event'
  | 'this_contract_type'
  | 'this_counterparty';

// Empty array = any role may submit.
export const EXCEPTION_SUBMITTERS: Record<ExceptionType, OrgRole[]> = {
  compliance_exception: [
    OrgRole.operator,
    OrgRole.warehouse_manager,
    OrgRole.financial_controller,
    OrgRole.compliance_officer,
  ],
  shariah_override_request: [OrgRole.shariah_reviewer, OrgRole.senior_shariah_board],
  prohibited_industry_dispute: [],
};

export function canSubmitException(role: OrgRole, type: ExceptionType): boolean {
  const allowed = EXCEPTION_SUBMITTERS[type];
  if (allowed.length === 0) return true;
  return allowed.includes(role);
}

export function getRequiredApprovers(type: ExceptionType, scope: ExceptionScope): OrgRole[] {
  if (type === 'compliance_exception') {
    const chain: OrgRole[] = [OrgRole.compliance_officer, OrgRole.shariah_reviewer];
    if (scope !== 'this_event') chain.push(OrgRole.senior_shariah_board);
    return chain;
  }
  if (type === 'shariah_override_request') {
    return [OrgRole.shariah_reviewer, OrgRole.senior_shariah_board];
  }
  if (type === 'prohibited_industry_dispute') {
    return [OrgRole.compliance_officer];
  }
  return [];
}

export function getCurrentStep(decisions: { step: number }[]): number {
  if (decisions.length === 0) return 1;
  return Math.max(...decisions.map(d => d.step)) + 1;
}
