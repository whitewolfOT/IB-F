import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { submit } from '../../api/exceptions';
import { useEvents } from '../../hooks/useEvents';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';

const SubmitException: React.FC = () => {
  const navigate = useNavigate();
  const { data: events, isLoading: eventsLoading } = useEvents();

  const { mutateAsync: submitEx, isPending } = useMutation({
    mutationFn: submit,
    onSuccess: (ex) => navigate(`/exceptions/${ex.exception_id}`),
  });

  const [eventId, setEventId] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!reason.trim()) errs.reason = 'Reason is required.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError('');
    try {
      await submitEx({ event_id: eventId || undefined, reason });
    } catch {
      setSubmitError('Failed to submit exception.');
    }
  };

  if (eventsLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const eventOptions = (events ?? []).map((ev) => ({
    value: ev.event_id,
    label: `${ev.event_id.slice(0, 8)}… — ${ev.contract_type}`,
  }));

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Submit Exception</h2>
        <p className="text-sm text-gray-500 mt-1">Request an exception review for a transaction or policy matter.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            id="event-id"
            label="Related Event (optional)"
            options={eventOptions}
            placeholder="-- None --"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
          <Textarea
            id="reason"
            label="Exception Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={errors.reason}
            rows={5}
            placeholder="Describe the exception and why it should be granted..."
          />
          {submitError && (
            <div className="bg-danger-light border border-danger/30 rounded-md p-3 text-sm text-danger">
              {submitError}
            </div>
          )}
          <Button type="submit" loading={isPending}>
            Submit Exception
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default SubmitException;
