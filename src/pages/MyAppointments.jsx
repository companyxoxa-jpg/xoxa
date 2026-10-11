import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { STATE_LABELS } from '../../base44/shared/booking.js';
import { formatCurrency } from '@/lib/format';
import { getLastStoreSlug } from '@/lib/storeContext';
export default function MyAppointments() {
  const [rows, setRows] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function load() { try { const r = await base44.functions.invoke('CustomerAppointments', { action: 'list' }); setRows(r.data.appointments); } catch { setError('No se pudieron cargar tus citas'); } }
  useEffect(() => { load(); }, []);
  async function cancel(id) { setBusy(true); setError(''); try { await base44.functions.invoke('CustomerAppointments', { action: 'cancel', id }); await load(); } catch (e) { setError(e.response?.data?.error || 'No se pudo cancelar'); } finally { setBusy(false); } }
  return <main className="max-w-3xl mx-auto p-5 min-h-screen"><Link to={getLastStoreSlug() ? `/store/${getLastStoreSlug()}` : '/demos'}>← Volver al negocio</Link><h1 className="text-3xl font-bold my-6">Mis citas</h1>{error && <p role="alert" className="booking-error">{error}</p>}{!rows && !error && <p>Cargando…</p>}{rows?.length === 0 && <p>Todavía no tienes citas.</p>}<div className="space-y-4">{rows?.sort((a, b) => b.starts_at.localeCompare(a.starts_at)).map(a => <article key={a.id} className="border rounded-2xl p-5"><h2 className="font-bold text-xl">{a.service_name}</h2><p>{a.professional_name} · {formatCurrency(a.price)}</p><p>{a.date} · {a.start_time} · {a.timezone}</p><p className="font-semibold mt-2">{STATE_LABELS[a.status]}</p>{['pending', 'confirmed'].includes(a.status) && Date.parse(a.starts_at) > Date.now() && <button disabled={busy} className="border rounded-xl px-4 py-2 mt-3" onClick={() => cancel(a.id)}>Cancelar cita</button>}</article>)}</div></main>;
}
