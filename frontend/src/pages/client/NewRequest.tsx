import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCreateEvent } from '../../hooks/useEvents';
import * as adminApi from '../../api/admin';
import * as partiesApi from '../../api/parties';
import { ContractType } from '../../types/index';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';

const CONTRACT_TYPES = Object.values(ContractType).map((ct) => ({ value: ct, label: ct.replace(/_/g, ' ') }));

type Step = 1 | 2;

const NewRequest: React.FC = () => {
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const { data: parties, isLoading: loadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partiesApi.list(),
  });

  const { data: config } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: adminApi.getConfig,
  });

  const [step, setStep] = useState<Step>(1);
  const [contractType, setContractType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const templates = config && typeof config['contract.templates'] === 'object'
    ? (config['contract.templates'] as Record<string, unknown>)
    : null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!contractType) errs.contractType = 'Select a contract type.';
    if (!description.trim()) errs.description = 'Description is required.';
    if (amount && isNaN(Number(amount))) errs.amount = 'Amount must be a number.';
    return errs;
  };

  const handleNext = () => {
    if (!contractType) {
      setErrors({ contractType: 'Select a contract type.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitError('');
    try {
      const ev = await createEvent({
        contract_type: contractType,
        description,
        amount: amount ? Number(amount) : undefined,
        currency,
        counterparty_id: counterpartyId || undefined,
      });
      navigate(`/requests/${ev.event_id}`);
    } catch {
      setSubmitError('Failed to create request. Please try again.');
    }
  };

  if (loadingParties) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const partyOptions = (parties ?? []).map((p) => ({ value: p.party_id, label: p.name }));

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">New Request</h2>
        <span className="text-sm text-gray-400">Step {step} of 2</span>
      </div>

      {step === 1 && (
        <Card title="Select Contract Type">
          <div className="flex flex-col gap-4">
            {templates && (
              <p className="text-sm text-gray-500">Choose a template or select a custom type below.</p>
            )}
            <Select
              id="contract-type"
              label="Contract Type"
              options={CONTRACT_TYPES}
              placeholder="-- Select --"
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              error={errors.contractType}
            />
            <Button onClick={handleNext} disabled={!contractType}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Request Details">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded p-3 text-sm">
              <span className="text-gray-500">Contract: </span>
              <span className="font-medium">{contractType.replace(/_/g, ' ')}</span>
              <button type="button" onClick={() => setStep(1)} className="ml-3 text-client text-xs hover:underline">Change</button>
            </div>
            <Textarea
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="amount"
                label="Amount (optional)"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
              <Input
                id="currency"
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
            <Select
              id="counterparty"
              label="Counterparty (optional)"
              options={partyOptions}
              placeholder="-- None --"
              value={counterpartyId}
              onChange={(e) => setCounterpartyId(e.target.value)}
            />
            {submitError && (
              <div className="bg-danger-light border border-danger/30 rounded-md p-3 text-sm text-danger">
                {submitError}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" loading={isPending}>Submit Request</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default NewRequest;
