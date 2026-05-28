import React, { useState } from 'react';
import { ApprovalState } from '../types/index';

const STATES: ApprovalState[] = [
  ApprovalState.draft,
  ApprovalState.submitted,
  ApprovalState.under_review,
  ApprovalState.operationally_verified,
  ApprovalState.financially_verified,
  ApprovalState.compliance_review,
  ApprovalState.shariah_review,
  ApprovalState.approved,
  ApprovalState.rejected,
  ApprovalState.returned_for_revision,
  ApprovalState.suspended,
  ApprovalState.settled,
  ApprovalState.archived,
];

const LABELS: Record<ApprovalState, string> = {
  [ApprovalState.draft]: 'Draft',
  [ApprovalState.submitted]: 'Submitted',
  [ApprovalState.under_review]: 'Under Review',
  [ApprovalState.operationally_verified]: 'Ops',
  [ApprovalState.financially_verified]: 'Finance',
  [ApprovalState.compliance_review]: 'Compliance',
  [ApprovalState.shariah_review]: 'Shariah',
  [ApprovalState.approved]: 'Approved',
  [ApprovalState.rejected]: 'Rejected',
  [ApprovalState.returned_for_revision]: 'Revision',
  [ApprovalState.suspended]: 'Suspended',
  [ApprovalState.settled]: 'Settled',
  [ApprovalState.archived]: 'Archived',
};

// States in normal approval flow (excluding terminal/exception states)
const FLOW_STATES: ApprovalState[] = [
  ApprovalState.draft,
  ApprovalState.submitted,
  ApprovalState.under_review,
  ApprovalState.operationally_verified,
  ApprovalState.financially_verified,
  ApprovalState.compliance_review,
  ApprovalState.shariah_review,
  ApprovalState.approved,
  ApprovalState.settled,
  ApprovalState.archived,
];

interface PipelineStripProps {
  currentState: ApprovalState | string;
}

const PipelineStrip: React.FC<PipelineStripProps> = ({ currentState }) => {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const states = FLOW_STATES;
  const currentIdx = states.indexOf(currentState as ApprovalState);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {states.map((state, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = state === currentState;
        const isFuture = idx > currentIdx;

        return (
          <div key={state} className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => isDone ? setTooltip(state) : null}
                onMouseLeave={() => setTooltip(null)}
                className={`h-7 px-2 rounded text-xs font-medium transition-all ${
                  isDone
                    ? 'bg-green-500 text-white cursor-pointer'
                    : isCurrent
                    ? 'bg-client text-white ring-2 ring-client/30'
                    : isFuture
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : ''
                }`}
              >
                {LABELS[state]}
              </button>
              {tooltip === state && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {STATES.includes(state as ApprovalState) ? state : state}
                </div>
              )}
            </div>
            {idx < states.length - 1 && (
              <svg className="h-3 w-3 text-gray-300 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStrip;
