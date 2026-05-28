import React from 'react';
import { ApprovalState } from '../../types/index';

const stateConfig: Record<string, { label: string; className: string }> = {
  [ApprovalState.draft]: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  [ApprovalState.submitted]: { label: 'Submitted', className: 'bg-gray-200 text-gray-800' },
  [ApprovalState.under_review]: { label: 'Under Review', className: 'bg-operator-light text-operator-dark' },
  [ApprovalState.operationally_verified]: { label: 'Ops Verified', className: 'bg-blue-100 text-blue-800' },
  [ApprovalState.financially_verified]: { label: 'Fin. Verified', className: 'bg-finance-light text-finance-dark' },
  [ApprovalState.compliance_review]: { label: 'Compliance', className: 'bg-comply-light text-comply-dark' },
  [ApprovalState.shariah_review]: { label: 'Shariah Review', className: 'bg-shariah-light text-shariah-dark' },
  [ApprovalState.approved]: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  [ApprovalState.rejected]: { label: 'Rejected', className: 'bg-danger-light text-danger-dark' },
  [ApprovalState.returned_for_revision]: { label: 'Needs Revision', className: 'bg-yellow-100 text-yellow-700' },
  [ApprovalState.suspended]: { label: 'Suspended', className: 'bg-danger-light text-danger' },
  [ApprovalState.settled]: { label: 'Settled', className: 'bg-gray-100 text-gray-500' },
  [ApprovalState.archived]: { label: 'Archived', className: 'bg-gray-50 text-gray-400' },
};

interface BadgeProps {
  state: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ state, className = '' }) => {
  const config = stateConfig[state] ?? { label: state, className: 'bg-gray-100 text-gray-600' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default Badge;
