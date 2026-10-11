import { MapPin, Phone, MessageCircle, Clock, Instagram, Facebook } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function fmtDay(d) {
  if (d.closed) return "Cerrado";
  if (d.continuous) return `${d.morning_open || ""}–${d.morning_close || ""}`;
  const m = d.morning_open ? `${d.morning_open}–${d.morning_close}` : null;
  const a = d.afternoon_open ? `${d.afternoon_open}–${d.afternoon_close}` : null;
  return [m, a].filter(Boolean).join(" · ") || "Cerrado";
}

// Template Engine V2 — Retail info footer. A clean 3-column footer (Tienda ·
// Ayuda · Horario) over a hairline top border. Distinct from Frutería's
// card and Carnicería's masthead info.
export default function RetailInfo({ business, settings, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "heading" ? "font-heading" : "font-display";
  const schedule = settings?.schedule || [];
  const hasSchedule = schedule.some((d) => !d.closed && (d.morning_open || d.afternoon_open));
  const socials = settings?.social_links || {};

  return (
    <footer className="retail-service-ribbon mt-12 border-t border-border bg-card">
      <div className="px-5 py-10 max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
        <div>
          <h3 className={`${headFont} font-semibold text-foreground text-base mb-3`} style={{ letterSpacing: "-0.01em" }}>{business.business_name}</h3>
          {settings?.store_description && <p className="text-sm text-muted-foreground leading-relaxed">{settings.store_description}</p>}
          {business.address && <p className="flex items-start gap-2 text-sm text-muted-foreground mt-3"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} /><span>{business.address}{business.city ? `, ${business.city}` : ""}</span></p>}
        </div>
        <div>
          <h3 className={`${headFont} font-semibold text-foreground text-base mb-3`} style={{ letterSpacing: "-0.01em" }}>Ayuda</h3>
          <div className="space-y-2">
            {business.contact_phone && <a href={`tel:${business.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{business.contact_phone}</a>}
            {business.whatsapp_phone && <a href={`https://wa.me/${business.whatsapp_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{business.whatsapp_phone}</a>}
            {business.contact_email && <a href={`mailto:${business.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{business.contact_email}</a>}
          </div>
          {(socials.instagram || socials.facebook) && (
            <div className="flex items-center gap-3 mt-4">
              {socials.instagram && <a href={socials.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" style={{ color: accent }}><Instagram className="w-3.5 h-3.5" /></a>}
              {socials.facebook && <a href={socials.facebook} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" style={{ color: accent }}><Facebook className="w-3.5 h-3.5" /></a>}
            </div>
          )}
        </div>
        <div>
          <h3 className={`${headFont} font-semibold text-foreground text-base mb-3 flex items-center gap-1.5`} style={{ letterSpacing: "-0.01em" }}><Clock className="w-4 h-4" style={{ color: accent }} />Horario</h3>
          {hasSchedule ? (
            <ul className="space-y-1.5">
              {schedule.map((d) => (
                <li key={d.day} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{DAY_NAMES[d.day]}</span>
                  <span className="text-foreground text-right">{fmtDay(d)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Consulta con el negocio.</p>}
        </div>
      </div>
      <div className="px-5 py-5 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">{business.business_name} · Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
      </div>
    </footer>
  );
}
