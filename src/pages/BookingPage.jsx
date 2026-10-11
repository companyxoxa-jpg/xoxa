import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BookingStorefront from '@/components/booking/BookingStorefront';
import { hasBooking } from '../../base44/shared/templates.js';
export default function BookingPage() {
  const { slug } = useParams(); const [business, setBusiness] = useState(null), [error, setError] = useState('');
  useEffect(() => { let active = true; setBusiness(null); setError(''); base44.functions.invoke('GetStorefront', { slug }).then(r => { if (active) { if (hasBooking(r.data.business)) setBusiness(r.data.business); else setError('Este negocio no ofrece reservas.'); } }).catch(() => { if (active) setError('No se pudo cargar el negocio.'); }); return () => { active = false; }; }, [slug]);
  if (!business) return <p className="p-8" role="status">{error || 'Cargando…'}</p>;
  return <BookingStorefront key={slug} business={business} slug={slug} />;
}
