import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isCustomer, isSuperAdmin } from '@/lib/rinno';

// Guards storefront account pages. Customers pass through; non-customers
// are redirected to the admin panel. Unauthenticated users go to login.
export default function CustomerRoute() {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  if (isLoadingAuth || !authChecked) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCustomer(user)) return <Navigate to={isSuperAdmin(user) ? "/command-center" : "/panel"} replace />;
  return <Outlet />;
}
