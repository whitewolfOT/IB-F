import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../../hooks/useConfig';
import { createProposal } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

interface Thresholds {
  approval_min_score: number;
  flag_score: number;
  auto_reject_score: number;
  max_exposure: number;
}

const DEFAULT_THRESHOLDS: Thresholds = {
  approval_min_score: 70,
  flag_score: 40,
  auto_reject_score: 20,
  max_exposure: 1000000,
};

const LABELS: Record<keyof Thresholds, { label: string; description: string }> = {
  approval_min_score: { label: 'Minimum Approval Score', description: 'Score required for automatic approval.' },
  flag_score: { label: 'Flag Score', description: 'Score below which a compliance flag is raised.' },
  auto_reject_score: { label: 'Auto-Reject Score', description: 'Score below which auto-rejection applies.' },
  max_exposure: { label: 'Max Single Exposure', description: 'Maximum amount for a single transaction.' },
};

const ThresholdsEditor: React.FC = () => {
  const qc = useQueryClient();
  const { data: config, isLoading } = useConfig();
  const { mutateAsync: propose, isPending } = useMutation({
    mutationFn: (thresholds: Thresholds) =>
      createProposal({ key: 'compliance.thresholds', proposed_value: thresholds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (config?.['compliance.thresholds']) {
      setThresholds({ ...DEFAULT_THRESHOLDS, ...(config['compliance.thresholds'] as Partial<Thresholds>) });
    }
  }, [config]);

  const handleChange = (key: keyof Thresholds, val: string) => {
    setThresholds((prev) => ({ ...prev, [key]: Number(val) || 0 }));
    setError('');
    setSuccess('');
  };

  const handlePropose = async () => {
    setError('');
    try {
      await propose(thresholds);
      setSuccess('Proposal submitted for ratification.');
    } catch {
      setError('Failed to submit proposal.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Thresholds Editor</h2>
        <p className="text-sm text-gray-500 mt-1">Configure system decision thresholds. Changes require ratification.</p>
      </div>

      <Card title="Compliance Thresholds">
        <div className="flex flex-col gap-4">
          {(Object.entries(thresholds) as [keyof Thresholds, number][]).map(([key, val]) => (
            <div key={key}>
              <Input
                id={`t-${key}`}
                label={LABELS[key].label}
                type="number"
                value={val}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{LABELS[key].description}</p>
            </div>
          ))}

          {error && <div className="bg-danger-light border border-danger/30 rounded p-3 text-sm text-danger">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">{success}</div>}

          <Button onClick={handlePropose} loading={isPending} className="bg-master hover:bg-master-dark text-white">
            Propose Changes
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ThresholdsEditor;
