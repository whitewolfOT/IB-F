import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvent, useTransitionEvent } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import PipelineStrip from '../../components/PipelineStrip';
import AuditTimeline from '../../components/AuditTimeline';
import Spinner from '../../components/ui/Spinner';
import { ApprovalState } from '../../types/index';

const VerifyEvent: React.FC = () => {
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
      navigate('/verify');
    } catch {
      setActionError('Transition failed. Please try again.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !event) {
    return <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load event.</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/verify" className="text-xs text-client hover:underline">← Back to Queue</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Operational Verification</h2>
          <p className="text-xs font-mono text-gray-400">{event.event_id}</p>
        </div>
        <Badge state={event.state} />
      </div>

      <Card title="Pipeline">
        <PipelineStrip currentState={event.state as ApprovalState} />
      </Card>

      <Card title="Event Details">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Contract Type</dt>
            <dd className="font-medium">{event.contract_type}</dd>
          </div>
          {event.amount !== undefined && (
            <div>
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono">{event.amount} {event.currency}</dd>
            </div>
          )}
          {event.description && (
            <div className="col-span-2">
              <dt className="text-gray-500">Description</dt>
              <dd>{event.description as string}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card title="Verification Action">
        <div className="flex flex-col gap-4">
          <Textarea
            id="reason"
            label="Notes / Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={actionError}
            placeholder="Describe your operational findings..."
          />
          <div className="flex gap-3">
            <Button
              variant="primary"
              loading={isPending}
              onClick={() => handleTransition(ApprovalState.operationally_verified)}
            >
              Mark Verified
            </Button>
            <Button
              variant="danger"
              loading={isPending}
              onClick={() => handleTransition(ApprovalState.rejected)}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              loading={isPending}
              onClick={() => handleTransition(ApprovalState.returned_for_revision)}
            >
              Return for Revision
            </Button>
          </div>
        </div>
      </Card>

      {event.audit_trail && (
        <Card title="Audit Trail">
          <AuditTimeline events={event.audit_trail} />
        </Card>
      )}
    </div>
  );
};

export default VerifyEvent;
