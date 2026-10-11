import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdmin } from '@/lib/rinno';
import RinnoLoading from '@/components/RinnoLoading';

export default function CommandCenterRoute() {
  const { user } = useAuth();
  const [role, setRole] = useState(isSuperAdmin(user) ? 'super_admin' : undefined);
  useEffect(() => {
    if (isSuperAdmin(user)) { setRole('super_admin'); return; }
    base44.functions.invoke('ManageCommercial', { action: 'current' })
      .then(r => setRole(r.data.role || null)).catch(() => setRole(null));
  }, [user]);
  if (role === undefined) return <RinnoLoading />;
  if (!role) return <Navigate to="/demos" replace />;
  return <Outlet context={{ commandRole: role }} />;
}
