import React from 'react';

interface FreezeAlertProps {
  settlement_frozen: boolean;
  profit_distribution_blocked: boolean;
  freeze_reason: string | null;
}

const FreezeAlert: React.FC<FreezeAlertProps> = ({ settlement_frozen, profit_distribution_blocked, freeze_reason }) => {
  if (!settlement_frozen && !profit_distribution_blocked) return null;

  const messages: string[] = [];
  if (settlement_frozen) messages.push('Settlement frozen');
  if (profit_distribution_blocked) messages.push('Profit distribution blocked');

  return (
    <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="text-lg leading-none mt-0.5" aria-hidden>⚠</span>
      <div>
        <p className="font-semibold">{messages.join(' · ')}</p>
        <p className="text-xs mt-0.5 text-red-600">
          Non-compliant Shariah ruling is in effect.
          {freeze_reason && <> Review reference: <span className="font-mono">{freeze_reason}</span></>}
        </p>
      </div>
    </div>
  );
};

export default FreezeAlert;
