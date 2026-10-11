import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isBusinessOwner } from '@/lib/rinno';

// Owner-only business tools must also be protected when their URL is entered
// directly. Backend authorization remains the source of truth; this guard keeps
// staff inside the operational workspace instead of exposing unusable forms.
export default function OwnerBusinessRoute() {
  const { user } = useAuth();
  return isBusinessOwner(user) ? <Outlet /> : <Navigate to="/panel" replace />;
}
