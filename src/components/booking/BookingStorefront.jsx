import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { formatServicePrice } from '@/lib/format';
import TemplateHero from '@/components/store/TemplateHero';
import { templateFor } from '@/lib/templates';
import { useBookingFlow } from '@/hooks/useBookingFlow';

// Legacy booking storefront (V1 templates). The booking flow logic now lives
// in useBookingFlow, shared with the V2 barber skin — this component keeps the
// original booking.css presentation and behavior unchanged.
export default function BookingStorefront({ business, slug }) {
  const { user } = useAuth();
  const flow = useBookingFlow(slug);
  const { catalog, service, professional, date, time, slots, error, busy, loadingSlots, receipt, name, phone, email, consent } = flow;
  const servicesRef = useRef(null);
  const template = templateFor(business);
  const brandStyle = /** @type {import('react').CSSProperties} */ ({ '--brand': business.primary_color || template.color, '--brand-secondary': business.secondary_color || template.color });
  return <div className="booking-site" style={brandStyle}>
    <header className="booking-header">
      <Link to={`/store/${slug}`} className="booking-logo">{business.logo && <img src={business.logo} alt="" />}<span>{business.business_name}</span></Link>
      <nav className="booking-header-actions" aria-label="Cuenta y reservas">
        <Link to={`/store/${slug}/booking-lookup`}>Consultar reserva</Link>
        <Link to={user ? `/store/${slug}/account/appointments` : `/store/${slug}/login?returnTo=${encodeURIComponent(`/store/${slug}/booking`)}`}>{user ? 'Mis citas' : 'Mi cuenta'} ↗</Link>
      </nav>
    </header>
    <main className="booking-container">
      <TemplateHero business={business} booking onAction={() => servicesRef.current?.scrollIntoView({ behavior: 'smooth' })} />
      <div ref={servicesRef} className="booking-content">
        {receipt ? <section className="booking-receipt" aria-live="polite"><span className="booking-check">✓</span><p className="template-eyebrow">Solicitud recibida</p><h2>Gracias, {name}.</h2><p>{service.name} con {professional.name}</p><p>{receipt.date} · {receipt.start_time} · {catalog.timezone}</p><p>El negocio revisará tu solicitud. Guarda la referencia para consultar su estado.</p><p className="text-sm break-all">Referencia: {receipt.id}</p><Link className="rinno-action" to={`/store/${slug}/booking-lookup`}>Consultar reserva</Link></section> : <>
          <div className="booking-section-title"><div><p className="template-eyebrow">Reserva online</p><h2>Encuentra tu momento.</h2></div><p>Servicio · Profesional · Fecha · Tus datos</p></div>
          {error && <p role="alert" className="booking-error">{error}</p>}
          {!catalog && !error && <p role="status">Cargando servicios…</p>}
          {catalog && <div className="booking-columns"><div>
            <h3>1. Elige un servicio</h3>
            <div className="booking-service-list">{catalog.services.map(s => <button key={s.id} aria-pressed={service?.id === s.id} className="booking-service" onClick={() => flow.selectService(s)}>
              {s.image && <img src={s.image} alt="" />}<span><strong>{s.name}</strong><small>{s.description}</small><small>{s.duration_minutes} min</small></span><b>{formatServicePrice(s.price, s.price_type)}</b>
            </button>)}</div>
            {!catalog.services.length && <p>Pronto podrás reservar nuestros servicios.</p>}
            {service && <section className="booking-step"><h3>2. Tu profesional</h3><div className="booking-professionals"><button className="booking-professional" aria-pressed={professional?.id === 'any'} onClick={() => flow.selectProfessional({id:'any',name:'Indiferente'})}><span className="booking-avatar">✦</span><strong>Indiferente</strong><small>Cualquier profesional disponible</small></button>{catalog.professionals.filter(p => p.service_ids.includes(service.id)).map(p => <button key={p.id} className="booking-professional" aria-pressed={professional?.id === p.id} onClick={() => flow.selectProfessional(p)}>
              {p.photo ? <img src={p.photo} alt={p.name} /> : <span className="booking-avatar">{p.name[0]}</span>}<strong>{p.name}</strong><small>{p.specialty}</small>
            </button>)}</div>{!catalog.professionals.some(p => p.service_ids.includes(service.id)) && <p>No hay profesionales disponibles para este servicio.</p>}</section>}
            {professional && <section className="booking-step"><h3>3. Fecha y hora</h3><label>Fecha de la cita<input type="date" value={date} onChange={e => flow.setDate(e.target.value)} /></label><p className="booking-help">Horas del negocio: {catalog.timezone}. Reservas con al menos 30 minutos de antelación, hasta 90 días.</p>
              {loadingSlots ? <p role="status">Buscando horas disponibles…</p> : date && <div className="booking-times">{slots.map(s => <button key={s.time} aria-pressed={time === s.time} onClick={() => flow.selectTime(s.time)}>{s.time}</button>)}{!slots.length && <p>No quedan horas disponibles. Prueba otra fecha.</p>}</div>}
            </section>}
          </div><aside className="booking-summary"><p className="template-eyebrow">Tu selección</p><h3>{service?.name || 'Tu próxima visita'}</h3><p>{professional?.name || 'Elige servicio y profesional'}</p>{service && <p>{service.duration_minutes} minutos · {formatServicePrice(service.price, service.price_type)}</p>}{date && <p>{date} {time && `· ${time}`}</p>}
            {time && <form onSubmit={e => { e.preventDefault(); flow.reserve(); }}><h3>4. Tus datos</h3>
              <label>Nombre<input required autoComplete="name" minLength={2} maxLength={100} value={name} onChange={e => flow.setName(e.target.value)} /></label>
              <label>Teléfono<input required type="tel" autoComplete="tel" pattern="[+()0-9\s-]{7,25}" value={phone} onChange={e => flow.setPhone(e.target.value)} /></label>
              {!user && <label>Correo electrónico<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => flow.setEmail(e.target.value)} /></label>}
              <label className="booking-consent"><input required type="checkbox" checked={consent} onChange={e => flow.setConsent(e.target.checked)} />Acepto que el negocio use mis datos para gestionar esta cita.</label>
              <button className="rinno-action" disabled={busy || !consent}>{busy ? 'Enviando…' : 'Solicitar reserva'}</button><small>La cita queda pendiente de confirmación del negocio.</small>
            </form>}
          </aside></div>}
        </>}
      </div>
    </main><footer className="booking-footer">{business.business_name} · {business.address || business.city}<span>Tecnología de RINNO</span></footer>
  </div>;
}
