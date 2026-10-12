import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Check, Calendar, ChevronLeft, User as UserIcon, Phone } from "lucide-react";
import { formatServicePrice } from "@/lib/format";

// Belleza/Spa V2 — booking as a calm, one-step-at-a-time wizard inside a single
// centered card, with a progress indicator and a running summary. Distinct
// from Barbería's all-steps-visible editorial layout with a sticky sidebar.
// Reuses useBookingFlow (single source of truth) — no booking logic here.
// The services/professionals sections only SCROLL here; the wizard owns all
// selection, so there is no external pre-selection to sync.
export default function SpaBooking({ flow, branding, slug, bookingRef }) {
  const { user } = useAuth();
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const { catalog, service, professional, date, time, slots, error, busy, loadingSlots, receipt, name, phone, consent } = flow;
  const [step, setStep] = useState(1);

  if (!catalog) return null;

  if (receipt) {
    return (
      <section ref={bookingRef} id="reservar" className="px-5 sm:px-6 mt-16">
        <div className="max-w-lg mx-auto rounded-3xl border p-8 text-center" style={{ borderColor: accent + "55" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: accent + "18" }}><Check className="w-7 h-7" style={{ color: accent }} /></div>
          <p className="text-[11px] uppercase tracking-[0.3em] mt-4" style={{ color: accent }}>Solicitud recibida</p>
          <h2 className={`${headFont} font-semibold text-foreground text-2xl mt-2`} style={{ letterSpacing: "-0.015em" }}>Gracias, {name || "pronto"}</h2>
          <p className="text-sm text-muted-foreground mt-3">{service.name} con {professional.name}</p>
          <p className="text-sm text-foreground mt-0.5">{receipt.date} · {receipt.start_time} · {catalog.timezone}</p>
          <p className="text-xs text-muted-foreground mt-4 break-all">Referencia: {receipt.id}</p>
          <Link to={`/store/${slug}/booking-lookup`} className="inline-block mt-5 px-6 h-10 leading-10 rounded-full text-white text-sm font-medium" style={{ backgroundColor: color }}>Consultar reserva</Link>
        </div>
      </section>
    );
  }

  const pros = service ? catalog.professionals.filter(p => p.service_ids.includes(service.id)) : [];
  const total = 4;

  return (
    <section ref={bookingRef} id="reservar" className="px-5 sm:px-6 mt-16">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Reserva</p>
          <h2 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl`} style={{ letterSpacing: "-0.015em" }}>Tu momento de calma</h2>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all" style={{ width: i + 1 <= step ? 26 : 10, backgroundColor: i + 1 <= step ? accent : "hsl(var(--muted))" }} />
          ))}
        </div>

        {error && <p role="alert" className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-500 text-center">{error}</p>}

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-5">
            <span style={{ color: accent, fontWeight: 600 }}>Paso {step}/{total}</span>
            <span>·</span>
            {service ? <span>{service.name}</span> : <span className="text-muted-foreground/70">Elige tratamiento</span>}
            {professional && <><span>·</span><span>{professional.name}</span></>}
            {date && <><span>·</span><span>{date}{time ? ` ${time}` : ""}</span></>}
          </div>

          {step === 1 && (
            <div>
              <h3 className={`${headFont} font-semibold text-foreground mb-4`}>Elige un tratamiento</h3>
              <div className="space-y-2.5">
                {catalog.services.map(s => (
                  <button key={s.id} onClick={() => { flow.selectService(s); setStep(2); }} className="w-full flex items-center justify-between gap-3 text-left p-3.5 rounded-2xl border transition-colors hover:bg-muted/50" style={{ borderColor: service?.id === s.id ? accent : "hsl(var(--border))" }}>
                    <span className="min-w-0"><span className="block font-medium text-foreground">{s.name}</span><span className="block text-xs text-muted-foreground mt-0.5">{s.duration_minutes} min</span></span>
                    <span className="font-semibold whitespace-nowrap" style={{ color: accent }}>{formatServicePrice(s.price, s.price_type)}</span>
                  </button>
                ))}
                {!catalog.services.length && <p className="text-sm text-muted-foreground">Pronto podrás reservar.</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <Back onBack={() => setStep(1)} label="Cambiar tratamiento" accent={accent} />
              <h3 className={`${headFont} font-semibold text-foreground mb-4`}>Tu profesional</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {pros.map(p => (
                  <button key={p.id} onClick={() => { flow.selectProfessional(p); setStep(3); }} className="flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-colors hover:bg-muted/50" style={{ borderColor: professional?.id === p.id ? accent : "hsl(var(--border))" }}>
                    {p.photo ? <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: color }}>{p.name[0]}</div>}
                    <span className="min-w-0"><span className="block text-sm font-medium text-foreground truncate">{p.name}</span>{p.specialty && <span className="block text-[11px] text-muted-foreground truncate">{p.specialty}</span>}</span>
                  </button>
                ))}
                {!pros.length && <p className="text-sm text-muted-foreground col-span-2">No hay profesionales para este tratamiento.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <Back onBack={() => setStep(2)} label="Cambiar profesional" accent={accent} />
              <h3 className={`${headFont} font-semibold text-foreground mb-4`}>Fecha y hora</h3>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <Calendar className="w-4 h-4" style={{ color: accent }} />
                <input aria-label="Fecha de la cita" type="date" value={date} onChange={e => flow.setDate(e.target.value)} className="bg-transparent border-b border-border focus:outline-none focus:border-foreground py-1.5" />
              </label>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Horas en {catalog.timezone}. Antelación mínima 30 min, hasta 90 días.</p>
              {loadingSlots && <p className="text-sm text-muted-foreground">Buscando horas…</p>}
              {!loadingSlots && date && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s.time} onClick={() => { flow.selectTime(s.time); setStep(4); }} className="h-10 rounded-xl text-sm font-medium border transition-colors" style={{ borderColor: time === s.time ? accent : "hsl(var(--border))", background: time === s.time ? accent : "transparent", color: time === s.time ? "#fff" : "hsl(var(--foreground))" }}>{s.time}</button>
                  ))}
                  {!slots.length && <p className="text-sm text-muted-foreground col-span-full">No quedan horas. Prueba otra fecha.</p>}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <Back onBack={() => setStep(3)} label="Cambiar fecha" accent={accent} />
              <h3 className={`${headFont} font-semibold text-foreground mb-1`}>Tus datos</h3>
              <p className="text-xs text-muted-foreground mb-4">{service.name} · {professional.name} · {date} · {time}</p>
              <DataForm flow={flow} color={color} user={user} slug={slug} name={name} phone={phone} consent={consent} busy={busy} accent={accent} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Back({ onBack, label, accent }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium mb-3 hover:opacity-70" style={{ color: accent }}>
      <ChevronLeft className="w-3.5 h-3.5" />{label}
    </button>
  );
}

function DataForm({ flow, color, user, slug, name, phone, consent, busy, accent }) {
  if (!user) {
    return (
      <div className="text-sm">
        <Link to={`/store/${slug}/login?returnTo=${encodeURIComponent(`/store/${slug}`)}`} className="inline-block px-5 h-10 leading-10 rounded-full text-white font-medium" style={{ backgroundColor: color }}>Inicia sesión para reservar</Link>
        <p className="text-xs text-muted-foreground mt-3">Accederás dentro del negocio y volverás a tu reserva.</p>
      </div>
    );
  }
  return (
    <form onSubmit={e => { e.preventDefault(); flow.reserve(); }} className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />Nombre</span>
        <input required autoComplete="name" minLength={2} maxLength={100} value={name} onChange={e => flow.setName(e.target.value)} className="mt-1 w-full px-3.5 h-11 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:ring-1" style={{ "--tw-ring-color": accent }} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Teléfono</span>
        <input required type="tel" autoComplete="tel" pattern="[+()0-9\s-]{7,25}" value={phone} onChange={e => flow.setPhone(e.target.value)} className="mt-1 w-full px-3.5 h-11 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:ring-1" style={{ "--tw-ring-color": accent }} />
      </label>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input required type="checkbox" checked={consent} onChange={e => flow.setConsent(e.target.checked)} className="mt-0.5" />
        <span>Acepto que el negocio use mis datos para gestionar esta cita.</span>
      </label>
      <button disabled={busy || !consent} className="w-full h-12 rounded-full text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: color }}>
        {busy ? "Enviando…" : "Solicitar reserva"}
      </button>
      <p className="text-xs text-muted-foreground text-center">La cita queda pendiente de confirmación.</p>
    </form>
  );
}
