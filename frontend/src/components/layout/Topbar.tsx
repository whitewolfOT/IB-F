import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';
import { useLocale } from '../../auth/LocaleContext';
import Button from '../ui/Button';

interface TopbarProps {
  title?: string;
}

const ROLE_LABELS: Record<string, string> = {
  operator: 'Operator',
  warehouse_manager: 'Warehouse Manager',
  procurement_officer: 'Procurement Officer',
  financial_controller: 'Financial Controller',
  risk_officer: 'Risk Officer',
  compliance_officer: 'Compliance Officer',
  shariah_reviewer: 'Shariah Reviewer',
  senior_shariah_board: 'Senior Shariah Board',
  auditor: 'Auditor',
  settlement_officer: 'Settlement Officer',
  counterparty: 'Counterparty',
  client: 'Client',
};

const Topbar: React.FC<TopbarProps> = ({ title = 'ICOS' }) => {
  const { user, logout, viewAsRole, setViewAsRole } = useContext(AuthContext);
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        {user?.is_master && (
          <>
            {viewAsRole && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Viewing as: {ROLE_LABELS[viewAsRole] ?? viewAsRole}
              </span>
            )}
            <select
              value={viewAsRole ?? ''}
              onChange={(e) => setViewAsRole(e.target.value || null)}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-client"
              title="View as role"
            >
              <option value="">Master View</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          className="text-xs font-semibold px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          title={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          {locale === 'en' ? 'AR' : 'EN'}
        </button>
        <div className="h-8 w-8 rounded-full bg-client text-white flex items-center justify-center text-sm font-bold uppercase">
          {user?.email?.[0] ?? 'U'}
        </div>
        <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
