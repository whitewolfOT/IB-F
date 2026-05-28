import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../../hooks/useConfig';
import { createProposal } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

interface Weights {
  noRiba: number;
  noGharar: number;
  assetBacked: number;
  ownershipValid: number;
  properRiskSharing: number;
}

const DEFAULT_WEIGHTS: Weights = {
  noRiba: 30,
  noGharar: 20,
  assetBacked: 20,
  ownershipValid: 15,
  properRiskSharing: 15,
};

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  noRiba: 'No Riba (Interest)',
  noGharar: 'No Gharar (Uncertainty)',
  assetBacked: 'Asset-Backed',
  ownershipValid: 'Ownership Valid',
  properRiskSharing: 'Proper Risk Sharing',
};

const WeightsEditor: React.FC = () => {
  const qc = useQueryClient();
  const { data: config, isLoading } = useConfig();
  const { mutateAsync: propose, isPending } = useMutation({
    mutationFn: (weights: Weights) =>
      createProposal({ key: 'compliance.weights', proposed_value: weights }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'proposals'] }),
  });

  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (config?.['compliance.weights']) {
      setWeights({ ...DEFAULT_WEIGHTS, ...(config['compliance.weights'] as Partial<Weights>) });
    }
  }, [config]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleChange = (key: keyof Weights, val: string) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setWeights((prev) => ({ ...prev, [key]: num }));
    setError('');
    setSuccess('');
  };

  const handlePropose = async () => {
    if (total !== 100) { setError(`Weights must sum to 100. Current total: ${total}`); return; }
    setError('');
    try {
      await propose(weights);
      setSuccess('Proposal submitted for ratification.');
    } catch {
      setError('Failed to submit proposal.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Weights Editor</h2>
        <p className="text-sm text-gray-500 mt-1">Adjust compliance scoring weights. Changes require ratification.</p>
      </div>

      <Card title="Compliance Weights">
        <div className="flex flex-col gap-5">
          {(Object.entries(weights) as [keyof Weights, number][]).map(([key, val]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={`w-${key}`} className="text-sm font-medium text-gray-700">
                  {WEIGHT_LABELS[key]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`w-${key}`}
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-16 text-right rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-master"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-master transition-all"
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          ))}

          <div className={`flex items-center justify-between rounded-md p-3 text-sm font-semibold ${total === 100 ? 'bg-green-50 text-green-700' : 'bg-danger-light text-danger'}`}>
            <span>Total</span>
            <span className="font-mono">{total} / 100</span>
          </div>

          {error && <div className="bg-danger-light border border-danger/30 rounded p-3 text-sm text-danger">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">{success}</div>}

          <Button
            onClick={handlePropose}
            disabled={total !== 100}
            loading={isPending}
            className="bg-master hover:bg-master-dark text-white"
          >
            Propose Change
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WeightsEditor;
