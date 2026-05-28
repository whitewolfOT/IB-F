import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContract } from '../../hooks/useContracts';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { SubledgerType } from '../../types/index';

const LedgerView: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const { data: contract, isLoading, error } = useContract(contractId ?? '');

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !contract) return <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load contract.</div>;

  const ledgerEntries = contract.ledger_entries as Array<Record<string, unknown>> | undefined;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link to="/financial" className="text-xs text-client hover:underline">← Back</Link>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Ledger View</h2>
        <p className="text-xs font-mono text-gray-400">{contract.contract_id}</p>
      </div>

      <Card title="Contract Summary">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Contract Type</dt>
            <dd className="font-medium">{contract.contract_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Amount</dt>
            <dd className="font-mono font-medium">{contract.amount ?? '—'} {contract.currency}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd>{contract.state ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Subledger Entries">
        {!ledgerEntries || ledgerEntries.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No ledger entries recorded.</p>
        ) : (
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Debit</th>
                <th className="pb-2 font-medium">Credit</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Ref</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-xs">
                    {Object.values(SubledgerType).includes(entry.type as SubledgerType)
                      ? entry.type as string
                      : String(entry.type ?? '—')}
                  </td>
                  <td className="py-2 text-green-700">{entry.debit != null ? String(entry.debit) : '—'}</td>
                  <td className="py-2 text-danger">{entry.credit != null ? String(entry.credit) : '—'}</td>
                  <td className="py-2 text-xs text-gray-500">
                    {entry.date ? new Date(String(entry.date)).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-xs text-gray-400">{entry.ref ? String(entry.ref) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default LedgerView;
