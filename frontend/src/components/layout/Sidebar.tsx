import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  roles?: string[];
  masterOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/requests/new', label: 'New Request' },
  { to: '/exceptions/new', label: 'Submit Exception' },
  { to: '/verify', label: 'Verification Queue', roles: ['operator', 'warehouse_manager'] },
  { to: '/assets', label: 'Asset Registry', roles: ['operator', 'warehouse_manager'] },
  { to: '/financial', label: 'Financial Queue', roles: ['financial_controller'] },
  { to: '/ledger', label: 'Ledger', roles: ['financial_controller'] },
  { to: '/shariah', label: 'Shariah Queue', roles: ['shariah_reviewer', 'senior_shariah_board'] },
  { to: '/shariah/history', label: 'Review History', roles: ['shariah_reviewer', 'senior_shariah_board'] },
  { to: '/compliance', label: 'Compliance Queue', roles: ['compliance_officer'] },
  { to: '/compliance/exceptions', label: 'Exception Review', roles: ['compliance_officer'] },
  { to: '/admin', label: 'Admin Panel', masterOnly: true },
  { to: '/admin/users', label: 'User Management', masterOnly: true },
  { to: '/admin/weights', label: 'Weights Editor', masterOnly: true },
  { to: '/admin/audit', label: 'Audit Log', masterOnly: true },
];

const Sidebar: React.FC = () => {
  const { user } = useContext(AuthContext);

  const visible = navItems.filter((item) => {
    if (item.masterOnly) return user?.is_master;
    if (item.roles && item.roles.length > 0) return item.roles.includes(user?.role ?? '');
    return true;
  });

  return (
    <nav className="w-56 min-h-screen bg-gray-900 text-white flex flex-col pt-4 pb-8 px-2 flex-shrink-0">
      <div className="px-3 mb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-400">ICOS</span>
        <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
        <span className="text-xs text-gray-400">{user?.role}{user?.is_master ? ' · master' : ''}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {visible.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-client text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
