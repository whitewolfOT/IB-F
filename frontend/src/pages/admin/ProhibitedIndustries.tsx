import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../../hooks/useConfig';
import { createProposal } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

const ProhibitedIndustries: React.FC = () => {
  const qc = useQueryClient();
  const { data: config, isLoading } = useConfig();
  const { mutateAsync: propose, isPending } = useMutation({
    mutationFn: (industries: string[]) =>
      createProposal({ key: 'prohibited.industries', proposed_value: industries }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  const [industries, setIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (Array.isArray(config?.['prohibited.industries'])) {
      setIndustries(config['prohibited.industries'] as string[]);
    }
  }, [config]);

  const addIndustry = () => {
    if (!newIndustry.trim()) return;
    if (industries.includes(newIndustry.trim())) return;
    setIndustries((prev) => [...prev, newIndustry.trim()]);
    setNewIndustry('');
  };

  const removeIndustry = (ind: string) => {
    setIndustries((prev) => prev.filter((i) => i !== ind));
  };

  const handlePropose = async () => {
    setError('');
    try {
      await propose(industries);
      setSuccess('Proposal submitted for ratification.');
    } catch {
      setError('Failed to submit proposal.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Prohibited Industries</h2>
        <p className="text-sm text-gray-500 mt-1">Industries excluded from Shariah-compliant financing.</p>
      </div>

      <Card title="Industry List">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              id="new-industry"
              placeholder="Add industry..."
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustry())}
            />
            <Button variant="secondary" onClick={addIndustry}>Add</Button>
          </div>

          {industries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No industries listed.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <li key={ind} className="flex items-center gap-1 bg-danger-light text-danger text-sm px-3 py-1 rounded-full">
                  {ind}
                  <button
                    type="button"
                    onClick={() => removeIndustry(ind)}
                    className="ml-1 hover:text-danger-dark"
                    aria-label={`Remove ${ind}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

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

export default ProhibitedIndustries;
