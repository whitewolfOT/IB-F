import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../../hooks/useConfig';
import { createProposal } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

// Layer C — Operational Integrity weights
// These are the ONLY compliance dimensions that may legitimately be weighted.
// Riba/maysir/gharar are binary gates (Layer A), not scoring dimensions.
const WEIGHT_KEYS = [
  'compliance.operational.weight.documentationComplete',
  'compliance.operational.weight.assetIdentified',
  'compliance.operational.weight.priceDisclosed',
  'compliance.operational.weight.deliverySpecified',
  'compliance.operational.weight.counterpartiesVerified',
] as const;

const KEY_LABELS: Record<typeof WEIGHT_KEYS[number], string> = {
  'compliance.operational.weight.documentationComplete': 'Supporting Documents Present',
  'compliance.operational.weight.assetIdentified':       'Asset Reference Identified',
  'compliance.operational.weight.priceDisclosed':        'Price / Cost Disclosed',
  'compliance.operational.weight.deliverySpecified':     'Delivery Date / Location Specified',
  'compliance.operational.weight.counterpartiesVerified':'Counterparties Verified',
};

const KEY_DEFAULTS: Record<typeof WEIGHT_KEYS[number], number> = {
  'compliance.operational.weight.documentationComplete': 25,
  'compliance.operational.weight.assetIdentified':       25,
  'compliance.operational.weight.priceDisclosed':        20,
  'compliance.operational.weight.deliverySpecified':     20,
  'compliance.operational.weight.counterpartiesVerified':10,
};

type WeightKey = typeof WEIGHT_KEYS[number];

const WeightsEditor: React.FC = () => {
  const qc = useQueryClient();
  const { data: config, isLoading } = useConfig();

  const [weights, setWeights] = useState<Record<WeightKey, number>>({ ...KEY_DEFAULTS });
  const [pendingKey, setPendingKey] = useState<WeightKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const { mutateAsync: propose, isPending } = useMutation({
    mutationFn: ({ key, value }: { key: WeightKey; value: number }) =>
      createProposal({
        key,
        proposed_value: value,
        justification: `Adjust Layer C operational weight: ${KEY_LABELS[key]} → ${value}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'proposals'] });
      setPendingKey(null);
      setSuccess('Proposal submitted for ratification.');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: () => setErrors((prev) => ({ ...prev, [pendingKey ?? '']: 'Failed to submit proposal.' })),
  });

  useEffect(() => {
    if (!config) return;
    const updated: Record<string, number> = {};
    for (const key of WEIGHT_KEYS) {
      const val = config[key];
      if (typeof val === 'number') updated[key] = val;
    }
    if (Object.keys(updated).length > 0) {
      setWeights((prev) => ({ ...prev, ...updated } as Record<WeightKey, number>));
    }
  }, [config]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleChange = (key: WeightKey, val: string) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setWeights((prev) => ({ ...prev, [key]: num }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setSuccess('');
  };

  const handlePropose = async (key: WeightKey) => {
    setPendingKey(key);
    setErrors({});
    await propose({ key, value: weights[key] });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Layer C — Operational Weights</h2>
        <p className="text-sm text-gray-500 mt-1">
          Adjust the weighting of quality metrics in the operational integrity score.
          Each change is submitted as a proposal requiring master ratification.
        </p>
        <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <strong>Note:</strong> These weights apply only to Layer C (documentation quality, traceability, disclosure).
          Riba, maysir, and prohibited industries are binary gates in Layer A and cannot be weighted.
        </div>
      </div>

      <Card title="Operational Integrity Weights">
        <div className="flex flex-col gap-6">
          {WEIGHT_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor={`w-${key}`} className="text-sm font-medium text-gray-700">
                  {KEY_LABELS[key]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`w-${key}`}
                    type="number"
                    min={0}
                    max={100}
                    value={weights[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-16 text-right rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-master"
                  />
                  <span className="text-sm text-gray-400">pts</span>
                </div>
              </div>

              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-master transition-all"
                  style={{ width: `${Math.min(weights[key], 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Default: {KEY_DEFAULTS[key]} pts
                </span>
                <Button
                  variant="ghost"
                  loading={isPending && pendingKey === key}
                  onClick={() => handlePropose(key)}
                  className="text-xs py-1 px-3"
                >
                  Propose
                </Button>
              </div>
              {errors[key] && <p className="text-xs text-danger">{errors[key]}</p>}
            </div>
          ))}

          <div className={`flex items-center justify-between rounded-md p-3 text-sm font-semibold ${
            total === 100 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            <span>Current total</span>
            <span className="font-mono">{total} / 100 {total !== 100 && '⚠ weights imbalanced'}</span>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default WeightsEditor;
