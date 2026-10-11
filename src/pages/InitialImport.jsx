import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getBusinessId, isBusinessOwner } from '@/lib/rinno';
import LaunchImporter from '@/components/admin/LaunchImporter';
import RinnoLoading from '@/components/RinnoLoading';

export default function InitialImport() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState('');
  const bid = getBusinessId(user);

  useEffect(() => {
    let active = true;
    if (!bid || !isBusinessOwner(user)) return undefined;
    base44.entities.Business.get(bid)
      .then((record) => active && setBusiness(record))
      .catch(() => active && setError('No se pudo cargar el negocio.'));
    return () => { active = false; };
  }, [bid, user]);

  if (!isBusinessOwner(user)) return <Navigate to="/panel" replace />;
  if (error) return <div className="p-4 md:p-7"><p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p></div>;
  if (!business) return <RinnoLoading />;

  return <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-7">
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Puesta en marcha</p>
      <h1 className="mt-1 font-heading text-3xl font-bold">Importar datos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Descarga una plantilla, añade tus datos y revisa la vista previa antes de confirmar. Cada archivo admite hasta 1000 filas.</p>
    </header>
    <LaunchImporter business={business} variant="light" />
  </main>;
}
