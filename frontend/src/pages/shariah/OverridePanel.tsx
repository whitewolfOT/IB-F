import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyOverride } from '../../api/reviews';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';

const OverridePanel: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { mutateAsync: override, isPending } = useMutation({
    mutationFn: (payload: Record<string, unknown>) => applyOverride(reviewId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      navigate('/shariah');
    },
  });

  const [overrideReason, setOverrideReason] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) { setError('Override reason is required.'); return; }
    if (!signature.trim()) { setError('Signature is required.'); return; }
    setError('');
    try {
      await override({ override_reason: overrideReason, signature });
    } catch {
      setError('Override failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <Link to={`/shariah/${reviewId}`} className="text-xs text-client hover:underline">← Back to Workbench</Link>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Override Panel</h2>
        <p className="text-xs font-mono text-gray-400">{reviewId}</p>
      </div>

      <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">
        <strong>Warning:</strong> Applying an override will supersede the existing ruling. This action is audited and irreversible.
      </div>

      <Card title="Senior Board Override">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            id="override-reason"
            label="Override Justification"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={5}
            placeholder="Provide full legal justification for this override..."
          />
          <Input
            id="signature"
            label="Senior Scholar Signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Full name as digital signature"
          />
          {error && <div className="bg-danger-light border border-danger/30 rounded p-3 text-sm text-danger">{error}</div>}
          <Button type="submit" variant="danger" loading={isPending}>
            Apply Override
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default OverridePanel;
