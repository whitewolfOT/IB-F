import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listEntries, getSummary } from '../../api/ledger';
import type { LedgerFilters } from '../../api/ledger';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

const SUBLEDGER_TYPES = [
  '', 'receivables', 'payables', 'partnership_capital',
  'profit_distribution', 'inventory', 'zakat', 'waqf', 'agency_fee', 'compliance_reserve',
];

const PAGE_SIZE = 50;

const LedgerView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<LedgerFilters>({
    contract_id: searchParams.get('contract_id') ?? undefined,
    subledger_type: undefined,
    since: undefined,
    until: undefined,
  });
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [page, setPage] = useState(0);

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['ledger', 'entries', filters],
    queryFn: () => listEntries(filters),
  });

  const { data: summary } = useQuery({
    queryKey: ['ledger', 'summary'],
    queryFn: () => getSummary(),
  });

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = (key: keyof LedgerFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const downloadReconciliation = () => {
    const params = new URLSearchParams();
    if (filters.since) params.set('since', filters.since);
    if (filters.until) params.set('until', filters.until);
    const query = params.toString();
    const url = `/api/exports/ledger/reconciliation${query ? `?${query}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-reconciliation.pdf';
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <Link to="/financial" className="text-xs text-client hover:underline">← Back</Link>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Ledger View</h2>
        <p className="text-xs text-gray-400">All ledger entries across contracts</p>
      </div>

      {/* Filter bar */}
      <Card title="Filters">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Subledger Type</label>
            <select
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-client"
              value={filters.subledger_type ?? ''}
              onChange={e => handleFilterChange('subledger_type', e.target.value)}
            >
              {SUBLEDGER_TYPES.map(t => (
                <option key={t} value={t}>{t || 'All'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Contract ID</label>
            <input
              type="text"
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-client"
              placeholder="ctr-…"
              value={filters.contract_id ?? ''}
              onChange={e => handleFilterChange('contract_id', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-client"
              value={filters.since ? filters.since.slice(0, 10) : ''}
              onChange={e => handleFilterChange('since', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-client"
              value={filters.until ? filters.until.slice(0, 10) : ''}
              onChange={e => handleFilterChange('until', e.target.value ? `${e.target.value}T23:59:59.999Z` : '')}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="text-xs text-gray-500 hover:text-gray-800 underline"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      </Card>

      {/* Reconciliation banner */}
      {summary && (
        <div
          className={`rounded-md border px-4 py-3 flex items-center justify-between cursor-pointer ${
            summary.balanced
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
          onClick={() => setShowReconciliation(v => !v)}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {summary.balanced ? '✓ Ledger balanced' : '⚠ Ledger imbalance detected'}
            <span className="text-xs font-normal opacity-70">
              ({summary.entry_count} entries)
            </span>
          </div>
          <span className="text-xs opacity-60">{showReconciliation ? '▲' : '▼'} Details</span>
        </div>
      )}

      {/* Reconciliation detail panel */}
      {summary && showReconciliation && (
        <Card title="Reconciliation Detail">
          <table className="w-full text-sm mb-3">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Total Debits</td>
                <td className="py-1.5 font-mono font-medium text-right">{summary.total_debits.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Total Credits</td>
                <td className="py-1.5 font-mono font-medium text-right">{summary.total_credits.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Imbalance</td>
                <td className={`py-1.5 font-mono font-medium text-right ${summary.imbalance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {summary.imbalance.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-500">Entry Count</td>
                <td className="py-1.5 font-mono font-medium text-right">{summary.entry_count}</td>
              </tr>
            </tbody>
          </table>
          <button
            className="text-sm bg-client text-white rounded px-4 py-1.5 hover:bg-client/90 transition-colors"
            onClick={downloadReconciliation}
          >
            Export reconciliation report
          </button>
        </Card>
      )}

      {/* Entries table */}
      <Card title={`Ledger Entries${entries.length > 0 ? ` (${entries.length})` : ''}`}>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : error ? (
          <p className="text-sm text-red-600">Failed to load entries.</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No ledger entries match the current filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium pr-3">Timestamp</th>
                    <th className="pb-2 font-medium pr-3">Contract</th>
                    <th className="pb-2 font-medium pr-3">Debit</th>
                    <th className="pb-2 font-medium pr-3">Credit</th>
                    <th className="pb-2 font-medium pr-3">Amount</th>
                    <th className="pb-2 font-medium pr-3">CCY</th>
                    <th className="pb-2 font-medium pr-3">Integrity</th>
                    <th className="pb-2 font-medium">Event</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((e) => (
                    <tr
                      key={e.entry_id}
                      className={`border-b border-gray-50 hover:bg-gray-50 ${e.integrity_verified === false ? 'border-l-2 border-l-red-500 bg-red-50' : ''}`}
                    >
                      <td className="py-1.5 pr-3 text-gray-500">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="py-1.5 pr-3 text-gray-700">{e.linked_contract_id}</td>
                      <td className="py-1.5 pr-3 text-green-700">{e.debit_account}</td>
                      <td className="py-1.5 pr-3 text-red-700">{e.credit_account}</td>
                      <td className="py-1.5 pr-3 text-gray-900">{e.amount.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{e.currency}</td>
                      <td className="py-1.5 pr-3">
                        {e.integrity_verified
                          ? <span className="text-green-600">✓</span>
                          : <span className="text-red-600 font-bold">✗</span>
                        }
                      </td>
                      <td className="py-1.5 text-gray-400">{e.originating_event_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2 py-0.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2 py-0.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default LedgerView;
