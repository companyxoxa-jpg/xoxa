import { MapPin, Phone, MessageCircle, Clock, Instagram, Facebook } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function fmtDay(d) {
  if (d.closed) return "Cerrado";
  if (d.continuous) return `${d.morning_open || ""}–${d.morning_close || ""}`;
  const m = d.morning_open ? `${d.morning_open}–${d.morning_close}` : null;
  const a = d.afternoon_open ? `${d.afternoon_open}–${d.afternoon_close}` : null;
  return [m, a].filter(Boolean).join(" · ") || "Cerrado";
}

// Belleza/Spa V2 — airy info block. A centered heading + a 3-column divided
// panel (Ubicación · Horario · El espacio) with hairline dividers. Distinct
// from Barbería's 2-column card and Frutería's single card.
export default function SpaInfo({ business, settings, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const schedule = settings?.schedule || [];
  const hasSchedule = schedule.some(d => !d.closed && (d.morning_open || d.afternoon_open));
  const socials = settings?.social_links || {};

  return (
    <section className="spa-visit-carousel px-5 sm:px-6 mt-16">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Visítanos</p>
        <h2 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl`} style={{ letterSpacing: "-0.015em" }}>{business.business_name}</h2>
      </div>
      <div className="max-w-3xl mx-auto grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border rounded-3xl border border-border overflow-hidden bg-card">
        <div className="p-6">
          <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>Ubicación</p>
          {business.address && <p className="flex items-start gap-2 text-sm text-foreground leading-relaxed"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} /><span>{business.address}{business.city ? `, ${business.city}` : ""}</span></p>}
          <div className="mt-3 space-y-2">
            {business.contact_phone && <a href={`tel:${business.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{business.contact_phone}</a>}
            {business.whatsapp_phone && <a href={`https://wa.me/${business.whatsapp_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{business.whatsapp_phone}</a>}
          </div>
          {(socials.instagram || socials.facebook) && (
            <div className="flex items-center gap-3 mt-4">
              {socials.instagram && <a href={socials.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" style={{ color: accent }}><Instagram className="w-3.5 h-3.5" /></a>}
              {socials.facebook && <a href={socials.facebook} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" style={{ color: accent }}><Facebook className="w-3.5 h-3.5" /></a>}
            </div>
          )}
        </div>
        <div className="p-6">
          <p className="text-[11px] uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5" style={{ color: accent }}><Clock className="w-3.5 h-3.5" />Horario</p>
          {hasSchedule ? (
            <ul className="space-y-1.5">
              {schedule.map(d => (
                <li key={d.day} className="flex justify-between gap-3 text-sm py-1">
                  <span className="text-muted-foreground">{DAY_NAMES[d.day]}</span>
                  <span className="text-foreground text-right">{fmtDay(d)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Consulta con el negocio.</p>}
        </div>
        <div className="p-6">
          <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>El espacio</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{settings?.store_description || business.tagline || "Un espacio para desconectar y cuidarte."}</p>
        </div>
      </div>
    </section>
  );
}
