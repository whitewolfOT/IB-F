import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import type { Review } from '../../api/reviews';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const ReviewHistory: React.FC = () => {
  const { data: reviews, isLoading, error } = useQuery<Review[]>({
    queryKey: ['reviews', 'all'],
    queryFn: () => client.get<Review[]>('/api/reviews').then((r) => r.data),
  });

  const completed = reviews?.filter((r) => r.ruling_type) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Review History</h2>
        <Link to="/shariah" className="text-sm text-shariah hover:underline">Queue →</Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load history.</div>
      ) : (
        <Card>
          {completed.length === 0 ? (
            <EmptyState title="No completed reviews" message="Completed Shariah reviews will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Review ID</th>
                  <th className="pb-2 font-medium">Ruling</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Updated</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => (
                  <tr key={r.review_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-500">{r.review_id.slice(0, 8)}…</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.ruling_type === 'permissible' ? 'bg-green-100 text-green-700' : 'bg-danger-light text-danger'}`}>
                        {r.ruling_type}
                      </span>
                    </td>
                    <td className="py-2">{typeof r.ruling_confidence === 'number' ? `${r.ruling_confidence}%` : '—'}</td>
                    <td className="py-2 text-xs text-gray-500">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <Link to={`/shariah/${r.review_id}`} className="text-shariah text-xs hover:underline">View →</Link>
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

export default ReviewHistory;
