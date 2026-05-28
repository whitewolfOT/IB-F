import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, withdraw } from '../../api/exceptions';
import type { Exception } from '../../api/exceptions';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import useAuth from '../../hooks/useAuth';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-danger-light text-danger',
  withdrawn: 'bg-gray-100 text-gray-500',
};

const ExceptionStatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: exception, isLoading, error } = useQuery<Exception>({
    queryKey: ['exceptions', id],
    queryFn: () => get(id!),
    enabled: !!id,
  });

  const { mutateAsync: doWithdraw, isPending: withdrawing } = useMutation({
    mutationFn: () => withdraw(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exceptions', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !exception) return <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load exception.</div>;

  const statusClass = STATUS_COLORS[exception.status] ?? 'bg-gray-100 text-gray-500';
  const canWithdraw = exception.status === 'pending' && exception.submitted_by === user?.user_id;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <Link to="/dashboard" className="text-xs text-client hover:underline">← Dashboard</Link>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Exception Status</h2>
        <p className="text-xs font-mono text-gray-400">{exception.exception_id}</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
              {exception.status}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Reason:</p>
            <p className="text-sm text-gray-800 bg-gray-50 rounded p-3">{exception.reason}</p>
          </div>

          {exception.event_id && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Related Event:</p>
              <Link to={`/requests/${exception.event_id}`} className="text-sm text-client hover:underline font-mono">
                {exception.event_id}
              </Link>
            </div>
          )}

          {exception.decision && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Decision:</p>
              <p className="text-sm text-gray-800">{exception.decision}</p>
              {exception.decided_by && (
                <p className="text-xs text-gray-400 mt-1">By {exception.decided_by} · {exception.decided_at ? new Date(exception.decided_at).toLocaleString() : ''}</p>
              )}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <dt>Submitted</dt>
              <dd>{new Date(exception.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(exception.updated_at).toLocaleString()}</dd>
            </div>
          </dl>

          {canWithdraw && (
            <Button variant="danger" size="sm" loading={withdrawing} onClick={() => doWithdraw()}>
              Withdraw Exception
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ExceptionStatus;
