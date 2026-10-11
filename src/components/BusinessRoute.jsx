import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isCustomer } from '@/lib/rinno';
import { base44 } from '@/api/base44Client';
import { getLastStoreSlug } from '@/lib/storeContext';

// Guards business admin routes. Customers are redirected to login (they have
// no admin access). Non-customers (owner/staff/super admin) pass through.
export default function BusinessRoute() {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  const customerLike = isCustomer(user);
  const [commercial, setCommercial] = useState(undefined);
  useEffect(() => {
    if (!customerLike || !isAuthenticated) { setCommercial(false); return; }
    let active = true;
    base44.functions.invoke('ManageCommercial', { action: 'current' })
      .then((response) => active && setCommercial(response.data.role === 'commercial'))
      .catch(() => active && setCommercial(false));
    return () => { active = false; };
  }, [customerLike, isAuthenticated, user]);
  if (isLoadingAuth || !authChecked) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (customerLike && commercial === undefined) return null;
  if (customerLike && commercial) return <Navigate to="/command-center" replace />;
  if (customerLike) { const slug=getLastStoreSlug(); return <Navigate to={slug ? `/store/${slug}/account` : "/demos"} replace />; }
  return <Outlet />;
}
