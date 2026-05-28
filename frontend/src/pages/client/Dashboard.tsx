import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { ApprovalState } from '../../types/index';

const Dashboard: React.FC = () => {
  const { data: events, isLoading, error } = useEvents();

  const total = events?.length ?? 0;
  const terminalStates: string[] = [ApprovalState.approved, ApprovalState.settled, ApprovalState.archived, ApprovalState.rejected];
  const pending = events?.filter((e) => !terminalStates.includes(e.state)).length ?? 0;
  const flags = events?.filter((e) => typeof e.compliance_score === 'number' && e.compliance_score < 40).length ?? 0;
  const recent = events?.slice(0, 10) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <Link to="/requests/new">
          <Button>New Request</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">
          Failed to load events.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Pending Approvals</p>
              <p className="text-3xl font-bold text-client">{pending}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Compliance Flags</p>
              <p className="text-3xl font-bold text-danger">{flags}</p>
            </Card>
          </div>

          <Card title="Recent Events">
            {recent.length === 0 ? (
              <EmptyState message="No events found. Create your first request." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                    <th className="pb-2 font-medium">Event ID</th>
                    <th className="pb-2 font-medium">Contract Type</th>
                    <th className="pb-2 font-medium">State</th>
                    <th className="pb-2 font-medium">Created</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((ev) => (
                    <tr key={ev.event_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs text-gray-500">{ev.event_id.slice(0, 8)}…</td>
                      <td className="py-2">{ev.contract_type}</td>
                      <td className="py-2"><Badge state={ev.state} /></td>
                      <td className="py-2 text-xs text-gray-500">{new Date(ev.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        <Link to={`/requests/${ev.event_id}`} className="text-client text-xs hover:underline">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
