import React from 'react';
import { useConfig } from '../../hooks/useConfig';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { OrgRole } from '../../types/index';

const AuthorityMatrix: React.FC = () => {
  const { data: config, isLoading, error } = useConfig();

  const matrix = config?.['authority.matrix'] as Record<string, string[]> | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Authority Matrix</h2>
        <p className="text-sm text-gray-500 mt-1">Role-based authority definitions for workflow transitions.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load config.</div>
      ) : (
        <Card>
          {!matrix ? (
            <p className="text-sm text-gray-500 italic">No authority matrix configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                    <th className="pb-2 font-medium">Action / State</th>
                    <th className="pb-2 font-medium">Authorized Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(matrix).map(([action, roles]) => (
                    <tr key={action} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-xs text-gray-700">{action}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(roles) ? roles : [roles]).map((role) => (
                            <span key={role} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {Object.values(OrgRole).includes(role as OrgRole) ? role : role}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AuthorityMatrix;
