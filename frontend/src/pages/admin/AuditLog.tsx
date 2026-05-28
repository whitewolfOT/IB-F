import React from 'react';
import { useEvents } from '../../hooks/useEvents';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

const AuditLog: React.FC = () => {
  const { data: events, isLoading, error } = useEvents();

  // Flatten all audit events from all events
  const allAuditEvents = (events ?? [])
    .flatMap((ev) =>
      (ev.audit_trail ?? []).map((ae) => ({ ...ae, event_contract_type: ev.contract_type })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
        <p className="text-sm text-gray-500 mt-1">Immutable record of all system actions.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load audit data.</div>
      ) : (
        <Card>
          {allAuditEvents.length === 0 ? (
            <EmptyState title="No audit events" message="Audit events will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Transition</th>
                </tr>
              </thead>
              <tbody>
                {allAuditEvents.map((ae, i) => (
                  <tr key={`${ae.event_id}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-xs font-mono text-gray-500">{new Date(ae.timestamp).toLocaleString()}</td>
                    <td className="py-2 text-xs">{ae.actor ?? '—'}</td>
                    <td className="py-2 text-xs">{ae.role ?? '—'}</td>
                    <td className="py-2 text-xs">{ae.action}</td>
                    <td className="py-2">
                      {ae.from_state && ae.to_state ? (
                        <div className="flex items-center gap-1">
                          <Badge state={ae.from_state} />
                          <span className="text-gray-300">→</span>
                          <Badge state={ae.to_state} />
                        </div>
                      ) : '—'}
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

export default AuditLog;
