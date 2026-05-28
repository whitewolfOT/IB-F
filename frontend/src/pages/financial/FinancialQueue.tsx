import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { ApprovalState } from '../../types/index';

const FinancialQueue: React.FC = () => {
  const { data: events, isLoading, error } = useEvents({ state: ApprovalState.operationally_verified });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">Financial Queue</h2>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load queue.</div>
      ) : (
        <Card>
          {!events || events.length === 0 ? (
            <EmptyState title="Queue empty" message="No events awaiting financial verification." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Event ID</th>
                  <th className="pb-2 font-medium">Contract Type</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">State</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.event_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-500">{ev.event_id.slice(0, 8)}…</td>
                    <td className="py-2">{ev.contract_type}</td>
                    <td className="py-2 font-mono">{ev.amount ?? '—'} {ev.currency}</td>
                    <td className="py-2"><Badge state={ev.state} /></td>
                    <td className="py-2 text-xs text-gray-500">{new Date(ev.created_at).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <Link to={`/financial/${ev.event_id}`} className="text-finance text-xs hover:underline">Review →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};

export default FinancialQueue;
