import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import Spinner from '../components/ui/Spinner';

interface ProtectedRouteProps {
  roles?: string[];
  masterOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, masterOnly }) => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (masterOnly && !user.is_master) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
