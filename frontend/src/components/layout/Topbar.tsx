import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';
import { useLocale } from '../../auth/LocaleContext';
import Button from '../ui/Button';

interface TopbarProps {
  title?: string;
}

const Topbar: React.FC<TopbarProps> = ({ title = 'ICOS' }) => {
  const { user, logout } = useContext(AuthContext);
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
