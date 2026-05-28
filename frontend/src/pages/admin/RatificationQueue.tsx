import React from 'react';
import { useProposals, useRatifyProposal, useRejectProposal } from '../../hooks/useConfig';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const RatificationQueue: React.FC = () => {
  const { data: proposals, isLoading, error } = useProposals();
  const { mutateAsync: ratify, isPending: ratifying } = useRatifyProposal();
  const { mutateAsync: reject, isPending: rejecting } = useRejectProposal();

  const pending = proposals?.filter((p) => p.status === 'pending') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">Ratification Queue</h2>
      <p className="text-sm text-gray-500">Config change proposals pending master ratification.</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load proposals.</div>
      ) : (
        <Card>
          {pending.length === 0 ? (
            <EmptyState title="No pending proposals" message="No config changes awaiting ratification." />
          ) : (
            <div className="flex flex-col gap-4">
              {pending.map((p) => (
                <div key={p.proposal_id} className="border border-gray-100 rounded-md p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-gray-400">{p.proposal_id}</p>
                      <p className="text-sm font-medium text-gray-800 mt-1">{String(p.key)}</p>
                      <pre className="text-xs bg-gray-50 rounded p-2 mt-2 overflow-x-auto">
                        {JSON.stringify(p.proposed_value, null, 2)}
                      </pre>
                      <p className="text-xs text-gray-500 mt-1">Proposed by {p.proposed_by} · {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        loading={ratifying}
                        onClick={() => ratify(p.proposal_id)}
                      >
                        Ratify
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={rejecting}
                        onClick={() => reject(p.proposal_id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default RatificationQueue;
