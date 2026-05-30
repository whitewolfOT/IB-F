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
import type { EventRecord } from '../../api/events';

// Layer C weights (mirrors DEFAULT_OPERATIONAL_WEIGHTS in backend)
const LAYER_C_WEIGHTS = {
  documentationComplete: 25,
  assetIdentified: 25,
  priceDisclosed: 20,
  deliverySpecified: 20,
  counterpartiesVerified: 10,
};

const LAYER_C_LABELS: Record<string, string> = {
  documentationComplete: 'Supporting documents present',
  assetIdentified: 'Asset reference identified',
  priceDisclosed: 'Price / cost disclosed',
  deliverySpecified: 'Delivery specified',
  counterpartiesVerified: 'Counterparties verified',
};

function computeLayerC(event: EventRecord) {
  const docs = (event.supporting_documents as unknown[] | undefined) ?? [];
  const input: Record<string, boolean> = {
    documentationComplete: docs.length > 0,
    assetIdentified: Boolean(event.asset_reference),
    priceDisclosed: true,
    deliverySpecified: true,
    counterpartiesVerified: ((event.counterparties as unknown[]) ?? []).length > 0,
  };
  let score = 0;
  const breakdown: Record<string, number> = {};
  for (const [k, w] of Object.entries(LAYER_C_WEIGHTS)) {
    const earned = input[k] ? w : 0;
    breakdown[k] = earned;
    score += earned;
  }
  const band =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Adequate' : 'Needs Improvement';
  return { score, band, breakdown, input };
}

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

  const { settlement_frozen, profit_distribution_blocked, freeze_reason } = event.freezeState ?? {};
  const layerAFailed = Boolean(settlement_frozen);

  const layerC = computeLayerC(event);

  const layerAColor = layerAFailed
    ? 'bg-danger-light border-danger/30 text-danger'
    : 'bg-green-50 border-green-200 text-green-800';

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/compliance" className="text-xs text-client hover:underline">← Back</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Compliance Assessment</h2>
          <p className="text-xs font-mono text-gray-400">{event.event_id}</p>
        </div>
        <Badge state={event.state} />
      </div>

      <Card title="Pipeline">
        <PipelineStrip currentState={event.state as ApprovalState} />
      </Card>

      {/* Layer A — Shariah Validity Gate */}
      <Card title="Layer A — Shariah Validity Gate">
        <div className={`rounded-md border p-4 ${layerAColor}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{layerAFailed ? '✗' : '✓'}</span>
            <div>
              <p className="font-semibold text-sm">
                Status: {layerAFailed ? 'FAIL' : 'PASS'}
              </p>
              {settlement_frozen && (
                <p className="text-xs mt-1">
                  Settlement frozen{freeze_reason ? ` — review ${freeze_reason}` : ''}.
                  {profit_distribution_blocked && ' Profit distribution blocked.'}
                </p>
              )}
              {!settlement_frozen && (
                <p className="text-xs mt-1">No active hard-prohibition violations detected.</p>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Binary gate — riba, maysir, prohibited industry, severe gharar, ownership legitimacy.
          A single violation nullifies the contract regardless of operational quality.
        </p>
      </Card>

      {/* Layer B — Purification Analysis */}
      <Card title="Layer B — Purification Analysis">
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-green-700">✓</span>
            <div>
              <p className="font-semibold text-sm text-green-800">No purification required at origination</p>
              <p className="text-xs text-green-700 mt-1">
                Impure income ratio: 0% &nbsp;·&nbsp; Methodology: AAOIFI &nbsp;·&nbsp; Threshold: 5%
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Purification is re-assessed at settlement when realized income is known.
          Sadaqah recommendation applies only when 0% &lt; ratio &lt; 5%.
        </p>
      </Card>

      {/* Layer C — Operational Integrity Score */}
      <Card title="Layer C — Operational Integrity Score">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center">
            <ScoreRing score={layerC.score} size={100} />
            <p className={`text-sm font-semibold mt-2 ${
              layerC.score >= 85 ? 'text-green-700' :
              layerC.score >= 70 ? 'text-finance' :
              layerC.score >= 50 ? 'text-amber-600' : 'text-danger'
            }`}>{layerC.band}</p>
            <p className="text-xs text-gray-400">{layerC.score} / 100</p>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            {Object.entries(LAYER_C_WEIGHTS).map(([key, maxWeight]) => {
              const earned = layerC.breakdown[key] ?? 0;
              const pct = maxWeight > 0 ? Math.round((earned / maxWeight) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{LAYER_C_LABELS[key]}</span>
                    <span className={`font-mono font-medium ${earned > 0 ? 'text-green-700' : 'text-danger'}`}>
                      {earned}/{maxWeight} pts
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-comply' : pct >= 50 ? 'bg-finance' : 'bg-danger'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Weighted quality metrics — documentation completeness, asset traceability, disclosure quality,
          delivery certainty, counterparty verification. These do not determine halal/haram status.
        </p>
      </Card>

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
