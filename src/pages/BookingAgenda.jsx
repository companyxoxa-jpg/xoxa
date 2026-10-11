import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { APPOINTMENT_STATES, STATE_LABELS, zonedParts } from '../../base44/shared/booking.js';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const emptyService = { name: '', price: 1500, price_type: 'fixed', duration_minutes: 30, description: '', image: '', active: true };
const emptyProfessional = { name: '', specialty: '', photo: '', active: true, service_ids: [], days_off: [], schedule: [] };
export default function BookingAgenda() {
  const [date, setDate] = useState(zonedParts(Date.now(), 'Europe/Madrid').date);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('agenda');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [filter, setFilter] = useState('');
  const [dayOff, setDayOff] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const load = useCallback(async () => {
    try { const res = await base44.functions.invoke('ManageBooking', { action: 'list', date }); setData(res.data); setError(''); }
    catch (e) { setError(e.response?.data?.error || 'No se pudo cargar la agenda'); }
  }, [date]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  function edit(field, value) { setEditor(e => ({ ...e, data: { ...e.data, [field]: value } })); }
  async function mutate(body) {
    setBusy(true); setError('');
    try { await base44.functions.invoke('ManageBooking', body); setEditor(null); await load(); }
    catch (e) { setError(e.response?.data?.error || 'No se pudo guardar'); }
    finally { setBusy(false); }
  }
  const appointments = (data?.appointments || []).filter(a => !filter || a.professional_id === filter).sort((a, b) => a.start_time.localeCompare(b.start_time));
  return <div className="booking-admin p-4 md:p-8 max-w-7xl mx-auto">
    <p className="text-sm text-muted-foreground">RINNO Booking</p><h1 className="text-3xl font-bold mb-2">Agenda del negocio</h1><p className="text-sm text-muted-foreground mb-6">Organiza tu equipo y cada visita. Horas en {data?.timezone || 'la zona del negocio'}.</p>
    <div className="flex flex-wrap gap-2 mb-6">{[['agenda', 'Agenda'], ['services', 'Servicios'], ['team', 'Profesionales'], ['closures', 'Cierres']].map(([key, label]) => <button className={`px-4 py-2 rounded-xl border ${tab === key ? 'bg-primary text-primary-foreground' : ''}`} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {error && !editor && <p role="alert" className="booking-error">{error}</p>}
    {!data && !error && <p>Cargando…</p>}
    {data && tab === 'agenda' && <>
      <div className="flex flex-wrap gap-3 items-end mb-5"><label>Fecha<input type="date" value={date} onChange={e => { setDate(e.target.value); setData(null); }} /></label><label>Profesional<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{data.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="border rounded-lg p-2" onClick={load}>Actualizar</button></div>
      <p role="status" className="mb-4 text-sm">{appointments.length} citas · {appointments.filter(a => a.status === 'pending').length} pendientes · Actualización cada 30 s</p>
      {!appointments.length && <div className="rounded-xl border p-8 text-center">No hay citas para esta selección.</div>}
      <div className="space-y-3">{appointments.map(a => <article key={a.id} className="border rounded-2xl p-4 flex flex-wrap items-start gap-4"><div className="font-bold text-lg">{a.start_time}<small className="block text-xs font-normal">{a.end_time}</small></div><div className="flex-1 min-w-0"><h2 className="font-bold break-words">{a.service_name} · {a.customer_name}</h2><p>{a.professional_name} · {formatCurrency(a.price)}</p><a className="text-sm underline" href={`tel:${a.phone}`}>{a.phone}</a><p className="text-sm mt-1">{STATE_LABELS[a.status]}</p></div><div className="flex flex-wrap gap-2">{(APPOINTMENT_STATES[a.status] || []).map(status => <button key={status} disabled={busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => mutate({ action: 'status', id: a.id, status })}>{status === 'confirmed' ? 'Confirmar' : STATE_LABELS[status]}</button>)}</div></article>)}</div>
    </>}
    {data && tab === 'closures' && <section className="max-w-3xl rounded-2xl border p-5 md:p-7">
      <h2 className="text-xl font-bold">Cierres del negocio</h2><p className="text-sm text-muted-foreground mt-1">Las fechas añadidas aquí bloquean las reservas para todo el equipo. Incluye los festivos y otros días en que no abrís.</p>
      {data.can_edit && <div className="flex flex-wrap gap-2 mt-4"><input aria-label="Fecha de cierre" type="date" value={closureDate} onChange={e => setClosureDate(e.target.value)} /><button disabled={!closureDate || busy} className="rounded-lg border px-3 py-2" onClick={async () => { const dates=[...new Set([...(data.booking_closed_dates||[]),closureDate])].sort(); await mutate({action:'save_closures',dates}); setClosureDate(''); }}>Añadir fecha</button></div>}
      <div className="flex flex-wrap gap-2 mt-4">{(data.booking_closed_dates||[]).map(day=><button type="button" key={day} disabled={!data.can_edit || busy} className="border rounded-full px-3 py-1.5 text-sm" onClick={() => mutate({action:'save_closures',dates:data.booking_closed_dates.filter(d=>d!==day)})}>{day}{data.can_edit?' ×':''}</button>)}</div>
      {!data.booking_closed_dates?.length && <p className="mt-4 text-sm text-muted-foreground">No hay cierres excepcionales configurados.</p>}
    </section>}
    {data && ['services', 'team'].includes(tab) && <>
      {data.can_edit && <button className="mb-5 px-4 py-2 rounded-xl bg-primary text-primary-foreground" onClick={() => { setError(''); setEditor({ kind: tab === 'services' ? 'service' : 'professional', data: tab === 'services' ? { ...emptyService } : structuredClone(emptyProfessional) }); }}>Añadir {tab === 'services' ? 'servicio' : 'profesional'}</button>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{(tab === 'services' ? data.services : data.professionals).map(row => <article key={row.id} className="border rounded-2xl p-5">{(row.photo || row.image) && <img className="w-full h-40 object-cover rounded-xl mb-4" src={row.photo || row.image} alt={row.name} />}<h2 className="font-bold text-lg">{row.name}</h2><p>{tab === 'services' ? `${row.price_type === 'from' ? 'Desde ' : ''}${formatCurrency(row.price)} · ${row.duration_minutes} min` : row.specialty}</p><p className="text-sm text-muted-foreground">{row.active ? 'Activo' : 'Archivado'}</p>{data.can_edit && <button className="border rounded-lg px-3 py-2 mt-3" onClick={() => { setError(''); setEditor({ kind: tab === 'services' ? 'service' : 'professional', id: row.id, data: structuredClone(row) }); }}>Editar</button>}</article>)}</div>
      {!(tab === 'services' ? data.services : data.professionals).length && <p>Aún no hay registros. Añade el primero para empezar.</p>}
    </>}
    <Dialog open={!!editor} onOpenChange={open => { if (!open && !busy) setEditor(null); }}><DialogContent className="booking-admin"><DialogTitle>{editor?.kind === 'service' ? 'Servicio' : 'Profesional'}</DialogTitle><DialogDescription>Los cambios se aplican solo a este negocio. Archivar conserva las citas anteriores.</DialogDescription>
      {editor && <form onSubmit={e => { e.preventDefault(); mutate({ action: `save_${editor.kind}`, id: editor.id, data: editor.data }); }} className="space-y-4">
        {error && <p role="alert" className="booking-error">{error}</p>}
        <label>Nombre<input required maxLength={100} value={editor.data.name} onChange={e => edit('name', e.target.value)} /></label>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={editor.data.active} onChange={e => edit('active', e.target.checked)} />Activo</label>
        {editor.kind === 'service' ? <>
          <div className="grid gap-3 sm:grid-cols-3"><label>Precio (€)<input required type="number" min="0" step="0.01" value={editor.data.price / 100} onChange={e => edit('price', Math.round(Number(e.target.value) * 100))} /></label><label>Cómo mostrar el precio<select value={editor.data.price_type||'fixed'} onChange={e=>edit('price_type',e.target.value)}><option value="fixed">Precio cerrado</option><option value="from">Desde</option></select></label><label>Duración (min)<input required type="number" min="5" max="480" value={editor.data.duration_minutes} onChange={e => edit('duration_minutes', Number(e.target.value))} /></label></div>
          <label>Descripción<textarea maxLength={1500} value={editor.data.description || ''} onChange={e => edit('description', e.target.value)} /></label><label>Imagen (URL HTTPS)<input type="url" value={editor.data.image || ''} onChange={e => edit('image', e.target.value)} /></label>
        </> : <>
          <label>Especialidad<input maxLength={240} value={editor.data.specialty || ''} onChange={e => edit('specialty', e.target.value)} /></label><label>Foto (URL HTTPS)<input type="url" value={editor.data.photo || ''} onChange={e => edit('photo', e.target.value)} /></label>
          <fieldset><legend className="font-semibold mb-2">Servicios que realiza</legend>{data?.services.map(s => <label key={s.id} className="flex items-center gap-2 mb-2"><input type="checkbox" checked={editor.data.service_ids.includes(s.id)} onChange={e => edit('service_ids', e.target.checked ? [...editor.data.service_ids, s.id] : editor.data.service_ids.filter(id => id !== s.id))} />{s.name}</label>)}</fieldset>
          <fieldset><legend className="font-semibold">Horario semanal</legend><p className="text-sm mb-3">Añade dos turnos para incluir un descanso. Sin turnos, no hay disponibilidad.</p>{editor.data.schedule.map((row, index) => <div key={index} className="schedule-row"><select aria-label={`Día turno ${index + 1}`} value={row.day} onChange={e => edit('schedule', editor.data.schedule.map((r, i) => i === index ? { ...r, day: Number(e.target.value) } : r))}>{days.map((day, n) => <option value={n} key={day}>{day}</option>)}</select>{['start', 'end'].map(field => <input required aria-label={`${field === 'start' ? 'Inicio' : 'Fin'} turno ${index + 1}`} key={field} type="time" value={row[field]} onChange={e => edit('schedule', editor.data.schedule.map((r, i) => i === index ? { ...r, [field]: e.target.value } : r))} />)}<button type="button" aria-label={`Quitar turno ${index + 1}`} onClick={() => edit('schedule', editor.data.schedule.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" className="underline mt-2" onClick={() => edit('schedule', [...editor.data.schedule, { day: 1, start: '09:00', end: '14:00' }])}>Añadir turno</button></fieldset>
          <fieldset><legend className="font-semibold">Días libres y vacaciones</legend><div className="flex flex-wrap gap-2"><input aria-label="Día libre" type="date" value={dayOff} onChange={e => setDayOff(e.target.value)} /><button type="button" disabled={!dayOff} onClick={() => { edit('days_off', [...new Set([...editor.data.days_off, dayOff])].sort()); setDayOff(''); }}>Añadir día</button></div><div className="flex flex-wrap gap-2 mt-2">{editor.data.days_off.map(day => <button type="button" key={day} className="border rounded px-2 py-1" aria-label={`Quitar día libre ${day}`} onClick={() => edit('days_off', editor.data.days_off.filter(d => d !== day))}>{day} ×</button>)}</div></fieldset>
        </>}
        <button disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground p-3">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>}
    </DialogContent></Dialog>
  </div>;
}
