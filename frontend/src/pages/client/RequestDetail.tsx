import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../../hooks/useEvents';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PipelineStrip from '../../components/PipelineStrip';
import AuditTimeline from '../../components/AuditTimeline';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/ui/Spinner';
import FreezeAlert from '../../components/FreezeAlert';
import { ApprovalState } from '../../types/index';

const RequestDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, error } = useEvent(eventId ?? '');

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  if (error || !event) {
    return (
      <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">
        Failed to load event.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-client hover:underline">← Back</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Request Detail</h2>
          <p className="text-xs font-mono text-gray-400">{event.event_id}</p>
        </div>
        <Badge state={event.state} />
      </div>

      <Card title="Pipeline">
        <PipelineStrip currentState={event.state as ApprovalState} />
      </Card>

      {event.freezeState && (
        <FreezeAlert
          settlement_frozen={event.freezeState.settlement_frozen}
          profit_distribution_blocked={event.freezeState.profit_distribution_blocked}
          freeze_reason={event.freezeState.freeze_reason}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2" title="Details">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Contract Type</dt>
              <dd className="font-medium">{event.contract_type}</dd>
            </div>
            {event.amount !== undefined && (
              <div>
                <dt className="text-gray-500">Amount</dt>
                <dd className="font-mono font-medium">{event.amount} {event.currency}</dd>
              </div>
            )}
            {event.description && (
              <div className="col-span-2">
                <dt className="text-gray-500">Description</dt>
                <dd>{event.description as string}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd>{new Date(event.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Updated</dt>
              <dd>{new Date(event.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        {typeof event.compliance_score === 'number' && (
          <Card title="Compliance Score">
            <div className="flex justify-center">
              <ScoreRing score={event.compliance_score} size={100} />
            </div>
          </Card>
        )}
      </div>

      {event.audit_trail && event.audit_trail.length > 0 && (
        <Card title="Audit Trail">
          <AuditTimeline events={event.audit_trail} />
        </Card>
      )}
    </div>
  );
};

export default RequestDetail;
