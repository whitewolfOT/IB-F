import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import type { Review } from '../../api/reviews';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const ShariahQueue: React.FC = () => {
  const [madhhabFilter, setMadhhabFilter] = useState(false);

  const { data: reviews, isLoading, error } = useQuery<Review[]>({
    queryKey: ['reviews', 'pending', madhhabFilter],
    queryFn: () => {
      const url = madhhabFilter ? '/api/reviews?madhhab_filter=true' : '/api/reviews';
      return client.get<Review[]>(url).then((r) => r.data);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Shariah Review Queue</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMadhhabFilter(f => !f)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              madhhabFilter
                ? 'bg-shariah text-white border-shariah'
                : 'bg-white text-gray-600 border-gray-200 hover:border-shariah hover:text-shariah'
            }`}
            title="Filter by my madhhab preference"
          >
            {madhhabFilter ? 'Madhhab filter: ON' : 'Filter by madhhab'}
          </button>
          <Link to="/shariah/history" className="text-sm text-shariah hover:underline">View History →</Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load reviews.</div>
      ) : (
        <Card>
          {!reviews || reviews.length === 0 ? (
            <EmptyState title="Queue empty" message="No pending Shariah reviews." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Review ID</th>
                  <th className="pb-2 font-medium">Event ID</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.review_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-500">{r.review_id.slice(0, 8)}…</td>
                    <td className="py-2 font-mono text-xs text-gray-500">{r.event_id?.slice(0, 8)}…</td>
                    <td className="py-2 text-xs">{r.status ?? '—'}</td>
                    <td className="py-2 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <Link to={`/shariah/${r.review_id}`} className="text-shariah text-xs hover:underline">Open →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};

export default ShariahQueue;
