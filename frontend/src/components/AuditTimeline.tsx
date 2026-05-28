import React from 'react';
import type { AuditEvent } from '../api/events';

const roleColorMap: Record<string, string> = {
  operator: 'bg-operator text-white',
  warehouse_manager: 'bg-operator-dark text-white',
  financial_controller: 'bg-finance text-white',
  compliance_officer: 'bg-comply text-white',
  shariah_reviewer: 'bg-shariah text-white',
  senior_shariah_board: 'bg-shariah-dark text-white',
  system: 'bg-gray-500 text-white',
};

interface AuditTimelineProps {
  events: AuditEvent[];
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return <p className="text-sm text-gray-500 italic">No audit events yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {events.map((ev, i) => (
        <li key={ev.event_id ?? i} className="mb-6 ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white bg-gray-200">
            <svg className="h-3 w-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColorMap[ev.role] ?? 'bg-gray-400 text-white'}`}>
              {ev.role}
            </span>
            <span className="text-xs font-mono text-gray-500">
              {new Date(ev.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800">{ev.action}</p>
          {ev.from_state && ev.to_state && (
            <p className="text-xs text-gray-500 mt-0.5">
              {ev.from_state} → {ev.to_state}
            </p>
          )}
          {ev.reason && <p className="text-xs text-gray-500 italic mt-0.5">"{ev.reason}"</p>}
        </li>
      ))}
    </ol>
  );
};

export default AuditTimeline;
