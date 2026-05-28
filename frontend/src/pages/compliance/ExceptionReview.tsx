import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { list, decide } from '../../api/exceptions';
import type { Exception } from '../../api/exceptions';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const ExceptionReview: React.FC = () => {
  const qc = useQueryClient();
  const { data: exceptions, isLoading, error } = useQuery<Exception[]>({
    queryKey: ['exceptions'],
    queryFn: () => list(),
  });

  const { mutateAsync: makeDecision, isPending } = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      decide(id, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exceptions'] }),
  });

  const pending = exceptions?.filter((e) => e.status === 'pending') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">Exception Review</h2>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load exceptions.</div>
      ) : (
        <Card>
          {pending.length === 0 ? (
            <EmptyState title="No pending exceptions" message="All exceptions have been reviewed." />
          ) : (
            <div className="flex flex-col gap-4">
              {pending.map((ex) => (
                <div key={ex.exception_id} className="border border-gray-100 rounded-md p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-gray-400">{ex.exception_id}</p>
                      <p className="text-sm font-medium text-gray-800 mt-1">{ex.reason}</p>
                      {ex.event_id && (
                        <Link to={`/requests/${ex.event_id}`} className="text-xs text-client hover:underline mt-1 block">
                          Related event: {ex.event_id.slice(0, 8)}…
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        loading={isPending}
                        onClick={() => makeDecision({ id: ex.exception_id, decision: 'approved' })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={isPending}
                        onClick={() => makeDecision({ id: ex.exception_id, decision: 'rejected' })}
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

export default ExceptionReview;
