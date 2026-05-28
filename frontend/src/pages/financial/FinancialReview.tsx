import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvent, useTransitionEvent, useSettleEvent } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import PipelineStrip from '../../components/PipelineStrip';
import AuditTimeline from '../../components/AuditTimeline';
import Spinner from '../../components/ui/Spinner';
import { ApprovalState } from '../../types/index';

const FinancialReview: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(eventId ?? '');
  const { mutateAsync: transition, isPending: transitionPending } = useTransitionEvent();
  const { mutateAsync: settle, isPending: settlePending } = useSettleEvent();

  const [reason, setReason] = useState('');
  const [realizedProfit, setRealizedProfit] = useState('');
  const [actionError, setActionError] = useState('');

  const handleTransition = async (newState: string) => {
    if (!reason.trim()) { setActionError('Reason is required.'); return; }
    setActionError('');
    try {
      await transition({ id: eventId!, payload: { newState, reason } });
      navigate('/financial');
    } catch {
      setActionError('Transition failed.');
    }
  };

  const handleSettle = async () => {
    if (!realizedProfit) { setActionError('Realized profit is required.'); return; }
    setActionError('');
    try {
      await settle({
        id: eventId!,
        payload: { contract: {}, realized_profit: Number(realizedProfit) },
      });
      navigate('/financial');
    } catch {
      setActionError('Settlement failed.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !event) return <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load event.</div>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/financial" className="text-xs text-client hover:underline">← Back to Queue</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Financial Review</h2>
          <p className="text-xs font-mono text-gray-400">{event.event_id}</p>
        </div>
        <Badge state={event.state} />
      </div>

      <Card title="Pipeline">
        <PipelineStrip currentState={event.state as ApprovalState} />
      </Card>

      <Card title="Financial Details">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Contract Type</dt>
            <dd className="font-medium">{event.contract_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Amount</dt>
            <dd className="font-mono font-medium">{event.amount ?? '—'} {event.currency}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Action">
        <div className="flex flex-col gap-4">
          <Textarea
            id="reason"
            label="Notes / Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Financial review findings..."
          />
          <div className="flex gap-3 flex-wrap">
            <Button loading={transitionPending} onClick={() => handleTransition(ApprovalState.financially_verified)}>
              Mark Financially Verified
            </Button>
            <Button variant="danger" loading={transitionPending} onClick={() => handleTransition(ApprovalState.rejected)}>
              Reject
            </Button>
          </div>

          {event.state === ApprovalState.approved && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Settle Transaction</p>
              <div className="flex gap-3 items-end">
                <Input
                  id="profit"
                  label="Realized Profit"
                  type="number"
                  value={realizedProfit}
                  onChange={(e) => setRealizedProfit(e.target.value)}
                  className="w-48"
                />
                <Button variant="secondary" loading={settlePending} onClick={handleSettle}>
                  Settle
                </Button>
              </div>
            </div>
          )}

          {actionError && <p className="text-sm text-danger">{actionError}</p>}
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

export default FinancialReview;
