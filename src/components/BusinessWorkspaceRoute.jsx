import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdmin, isSupportMode } from '@/lib/rinno';

// The business workspace belongs to owners and staff. A Super Admin can enter
// it only through the explicit support context selected in Command Center.
export default function BusinessWorkspaceRoute() {
  const { user } = useAuth();

  if (isSuperAdmin(user) && !isSupportMode(user)) {
    return <Navigate to="/command-center" replace />;
  }

  return <Outlet />;
}

