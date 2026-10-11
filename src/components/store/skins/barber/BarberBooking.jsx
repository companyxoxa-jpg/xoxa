import { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Check, Calendar, User as UserIcon, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/format";

// Barbería V2 — booking flow widget, visually coherent with the template.
// Reuses useBookingFlow (single source of truth); this component only renders
// the editorial steps + sticky summary. No booking logic lives here.
export default function BarberBooking({ flow, branding, slug, bookingRef }) {
  const { user } = useAuth();
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const { catalog, service, professional, date, time, slots, error, busy, loadingSlots, receipt, name, phone, email, consent } = flow;
  const formRef = useRef(null);
  const pros = service ? catalog?.professionals?.filter(p => p.service_ids?.includes(service.id)) || [] : [];

  if (!catalog) return null;
  if (receipt) {
    return (
      <section ref={bookingRef} id="reservar" className="px-4 sm:px-6 mt-10">
        <div className="max-w-xl mx-auto rounded-2xl border-2 p-6 text-center" style={{ borderColor: accent }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white" style={{ backgroundColor: accent }}><Check className="w-7 h-7" /></div>
          <p className="text-[11px] uppercase tracking-[0.28em] mt-4" style={{ color: accent }}>Solicitud recibida</p>
          <h2 className={`${headFont} font-bold text-foreground text-2xl mt-1`}>Gracias, {name || "pronto"}.</h2>
          <p className="text-sm text-muted-foreground mt-2">{service.name} con {receipt.professional_name || professional.name}</p>
          <p className="text-sm text-foreground mt-0.5">{receipt.date} · {receipt.start_time} · {catalog.timezone}</p>
          <p className="text-xs text-muted-foreground mt-3 break-all">Referencia: {receipt.id}</p>
          <Link to={`/store/${slug}/booking-lookup`} className="inline-block mt-4 px-5 h-10 leading-10 rounded-full text-white text-sm font-semibold" style={{ backgroundColor: color }}>Consultar reserva</Link>
        </div>
      </section>
    );
  }

  const step = time ? 4 : date ? 3 : professional ? 3 : service ? 2 : 1;

  return (
    <section ref={bookingRef} id="reservar" className="px-4 sm:px-6 mt-12">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.28em] mb-1.5" style={{ color: accent }}>Reserva online</p>
        <h2 className={`${headFont} font-bold text-foreground text-2xl sm:text-3xl leading-tight`}>Encuentra tu momento</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Servicio · Profesional · Fecha · Tus datos</p>
      </div>

      {error && <p role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">{error}</p>}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="space-y-7">
          {/* Step 1 — service */}
          <div>
            <StepLabel n={1} label="Elige un servicio" accent={accent} active={step >= 1} />
            <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
              {catalog.services.map(s => (
                <button key={s.id} onClick={() => flow.selectService(s)} aria-pressed={service?.id === s.id}
                  className="text-left rounded-xl p-3 border-2 transition-colors" style={{ borderColor: service?.id === s.id ? accent : "hsl(var(--border))", background: service?.id === s.id ? accent + "12" : "hsl(var(--card))" }}>
                  <p className="font-semibold text-foreground text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.duration_minutes} min · {s.price_type === "from" ? "Desde " : ""}{formatCurrency(s.price)}</p>
                </button>
              ))}
              {!catalog.services.length && <p className="text-sm text-muted-foreground">Pronto podrás reservar nuestros servicios.</p>}
            </div>
          </div>

          {/* Step 2 — professional */}
          {service && (
            <div>
              <StepLabel n={2} label="Tu profesional" accent={accent} active={step >= 2} />
              <div className="flex flex-wrap gap-2.5 mt-3">
                <button onClick={() => flow.selectProfessional({ id: "any", name: "Indiferente" })} aria-pressed={professional?.id === "any"}
                  className="flex items-center gap-2.5 rounded-xl p-2 pr-4 border-2 transition-colors" style={{ borderColor: professional?.id === "any" ? accent : "hsl(var(--border))", background: professional?.id === "any" ? accent + "12" : "hsl(var(--card))" }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>✦</span>
                  <span><span className="block text-sm font-semibold text-foreground">Indiferente</span><span className="block text-xs text-muted-foreground">Cualquier barbero disponible</span></span>
                </button>
                {pros.map(p => (
                  <button key={p.id} onClick={() => flow.selectProfessional(p)} aria-pressed={professional?.id === p.id}
                    className="flex items-center gap-2.5 rounded-xl p-2 pr-4 border-2 transition-colors" style={{ borderColor: professional?.id === p.id ? accent : "hsl(var(--border))", background: professional?.id === p.id ? accent + "12" : "hsl(var(--card))" }}>
                    {p.photo ? <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>{p.name[0]}</div>}
                    <span><span className="block text-sm font-semibold text-foreground">{p.name}</span>{p.specialty && <span className="block text-xs text-muted-foreground">{p.specialty}</span>}</span>
                  </button>
                ))}
                {!pros.length && <p className="text-sm text-muted-foreground">No hay profesionales para este servicio.</p>}
              </div>
            </div>
          )}

          {/* Step 3 — date & time */}
          {professional && (
            <div>
              <StepLabel n={3} label="Fecha y hora" accent={accent} active={step >= 3} />
              <div className="mt-3 rounded-xl border border-border p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="w-4 h-4" style={{ color: accent }} />
                  <input aria-label="Fecha de la cita" type="date" value={date} onChange={e => flow.setDate(e.target.value)} className="bg-transparent border-b border-border focus:outline-none focus:border-foreground py-1" />
                </label>
                <p className="text-xs text-muted-foreground mt-2">Horas en {catalog.timezone}. Antelación mínima 30 min, hasta 90 días.</p>
                {loadingSlots && <p className="text-sm text-muted-foreground mt-3">Buscando horas disponibles…</p>}
                {!loadingSlots && date && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {slots.map(s => (
                      <button key={s.time} onClick={() => flow.selectTime(s.time)} aria-pressed={time === s.time}
                        className="px-3 h-9 rounded-lg text-sm font-medium border-2 transition-colors" style={{ borderColor: time === s.time ? accent : "hsl(var(--border))", background: time === s.time ? accent : "transparent", color: time === s.time ? "#fff" : "hsl(var(--foreground))" }}>{s.time}</button>
                    ))}
                    {!slots.length && <p className="text-sm text-muted-foreground">No quedan horas. Prueba otra fecha.</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — data (inline on mobile, in summary on desktop) */}
          {time && (
            <div className="lg:hidden" ref={formRef}>
              <StepLabel n={4} label="Tus datos" accent={accent} active />
              <DataForm flow={flow} color={color} user={user} slug={slug} name={name} phone={phone} email={email} consent={consent} busy={busy} />
            </div>
          )}
        </div>

        {/* Desktop sticky summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border-2 p-5" style={{ borderColor: accent + "55" }}>
            <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>Tu selección</p>
            <h3 className={`${headFont} font-bold text-foreground text-xl mt-1`}>{service?.name || "Tu próxima visita"}</h3>
            <p className="text-sm text-muted-foreground mt-1">{professional?.name || "Elige servicio y profesional"}</p>
            {service && <p className="text-sm text-foreground mt-1">{service.duration_minutes} min · {service.price_type === "from" ? "Desde " : ""}{formatCurrency(service.price)}</p>}
            {date && <p className="text-sm text-foreground mt-1">{date}{time && ` · ${time}`}</p>}
            {time && (
              <div ref={formRef} className="mt-4 pt-4 border-t border-border">
                <StepLabel n={4} label="Tus datos" accent={accent} active />
                <DataForm flow={flow} color={color} user={user} slug={slug} name={name} phone={phone} email={email} consent={consent} busy={busy} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function StepLabel({ n, label, accent, active }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: active ? accent : "hsl(var(--muted))", color: active ? "#fff" : "hsl(var(--muted-foreground))" }}>{n}</span>
      <h3 className="font-heading font-semibold text-foreground">{label}</h3>
    </div>
  );
}

function DataForm({ flow, color, user, slug, name, phone, email, consent, busy }) {
  return (
    <form onSubmit={e => { e.preventDefault(); flow.reserve(); }} className="mt-3 space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />Nombre</span>
        <input required autoComplete="name" minLength={2} maxLength={100} value={name} onChange={e => flow.setName(e.target.value)} className="mt-1 w-full px-3 h-10 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1" style={{ "--tw-ring-color": color }} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Teléfono</span>
        <input required type="tel" autoComplete="tel" pattern="[+()0-9\s-]{7,25}" value={phone} onChange={e => flow.setPhone(e.target.value)} className="mt-1 w-full px-3 h-10 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1" style={{ "--tw-ring-color": color }} />
      </label>
      {!user && <label className="block"><span className="text-xs font-medium text-muted-foreground">Correo electrónico</span><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => flow.setEmail(e.target.value)} className="mt-1 w-full px-3 h-10 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1" style={{ "--tw-ring-color": color }} /></label>}
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input required type="checkbox" checked={consent} onChange={e => flow.setConsent(e.target.checked)} className="mt-0.5" />
        <span>Acepto que el negocio use mis datos para gestionar esta cita.</span>
      </label>
      <button disabled={busy || !consent} className="w-full h-11 rounded-full text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: color }}>
        {busy ? "Enviando…" : "Solicitar reserva"}
      </button>
      <p className="text-xs text-muted-foreground text-center">La cita queda pendiente de confirmación.</p>
      {!user && <p className="text-xs text-center"><Link className="underline" to={`/store/${slug}/booking-lookup`}>Consultar una reserva</Link></p>}
    </form>
  );
}
