import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEvent, useTransitionEvent } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import ScoreRing from '../../components/ScoreRing';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import PipelineStrip from '../../components/PipelineStrip';
import { ApprovalState } from '../../types/index';
import { useState } from 'react';
import Textarea from '../../components/ui/Textarea';

const ScoreBreakdown: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(eventId ?? '');
  const { mutateAsync: transition, isPending } = useTransitionEvent();
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const handleTransition = async (newState: string) => {
    if (!reason.trim()) { setActionError('Reason is required.'); return; }
    setActionError('');
    try {
      await transition({ id: eventId!, payload: { newState, reason } });
      navigate('/compliance');
    } catch {
      setActionError('Transition failed.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !event) return <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load event.</div>;

  const breakdown = event.compliance_breakdown as Record<string, number> | undefined;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/compliance" className="text-xs text-client hover:underline">← Back</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Compliance Score Breakdown</h2>
          <p className="text-xs font-mono text-gray-400">{event.event_id}</p>
        </div>
        <Badge state={event.state} />
      </div>

      <Card title="Pipeline">
        <PipelineStrip currentState={event.state as ApprovalState} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {typeof event.compliance_score === 'number' && (
          <Card title="Overall Score">
            <div className="flex justify-center">
              <ScoreRing score={event.compliance_score} size={100} />
            </div>
          </Card>
        )}

        {breakdown && (
          <Card title="Score Components" className="md:col-span-2">
            <div className="flex flex-col gap-3">
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-medium">{Math.round(val * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${val >= 0.7 ? 'bg-comply' : val >= 0.4 ? 'bg-finance' : 'bg-danger'}`}
                      style={{ width: `${Math.round(val * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card title="Action">
        <div className="flex flex-col gap-4">
          <Textarea
            id="reason"
            label="Notes"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Compliance review findings..."
          />
          {actionError && <p className="text-sm text-danger">{actionError}</p>}
          <div className="flex gap-3">
            <Button loading={isPending} onClick={() => handleTransition(ApprovalState.shariah_review)}>
              Forward to Shariah
            </Button>
            <Button variant="danger" loading={isPending} onClick={() => handleTransition(ApprovalState.rejected)}>
              Reject
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ScoreBreakdown;
