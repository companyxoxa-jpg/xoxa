import { MapPin, Phone, MessageCircle, Clock, Instagram, Facebook } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function fmtDay(d) {
  if (d.closed) return "Cerrado";
  if (d.continuous) return `${d.morning_open || ""}–${d.morning_close || ""}`;
  const m = d.morning_open ? `${d.morning_open}–${d.morning_close}` : null;
  const a = d.afternoon_open ? `${d.afternoon_open}–${d.afternoon_close}` : null;
  return [m, a].filter(Boolean).join(" · ") || "Cerrado";
}

// Barbería V2 — commerce info. A two-column editorial block: big
// address/contact on the left, weekly schedule on the right. Distinct from
// Frutería (single card) and Carnicería (3-col ficha).
export default function BarberInfo({ business, settings, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const schedule = settings?.schedule || [];
  const hasSchedule = schedule.some(d => !d.closed && (d.morning_open || d.afternoon_open));
  const socials = settings?.social_links || {};

  return (
    <section className="barber-visit-strip px-4 sm:px-6 mt-12">
      <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border">
        <div className="p-6 sm:p-8 bg-card">
          <p className="text-[11px] uppercase tracking-[0.28em] mb-3" style={{ color: accent }}>Visítanos</p>
          <h2 className={`${headFont} font-bold text-foreground text-2xl leading-tight`}>{business.business_name}</h2>
          {business.address && <p className="flex items-start gap-2 text-sm text-muted-foreground mt-3"><MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} /><span>{business.address}{business.city ? `, ${business.city}` : ""}</span></p>}
          <div className="mt-4 space-y-2">
            {business.contact_phone && <a href={`tel:${business.contact_phone}`} className="flex items-center gap-2 text-sm text-foreground hover:underline"><Phone className="w-4 h-4 shrink-0" style={{ color: accent }} />{business.contact_phone}</a>}
            {business.whatsapp_phone && <a href={`https://wa.me/${business.whatsapp_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:underline"><MessageCircle className="w-4 h-4 shrink-0" style={{ color: accent }} />{business.whatsapp_phone}</a>}
          </div>
          {(socials.instagram || socials.facebook || socials.threads || socials.tiktok) && (
            <nav aria-label="Redes sociales" className="flex flex-wrap items-center gap-2 mt-5">
              {socials.instagram && <a aria-label="Instagram" title="Instagram" href={socials.instagram} target="_blank" rel="noreferrer" className="min-h-10 rounded-full border border-border px-3 flex items-center gap-2 hover:bg-muted" style={{ color: accent }}><Instagram className="w-4 h-4" /><span className="text-xs font-medium">Instagram</span></a>}
              {socials.threads && <a aria-label="Threads" title="Threads" href={socials.threads} target="_blank" rel="noreferrer" className="min-h-10 rounded-full border border-border px-3 flex items-center gap-2 hover:bg-muted" style={{ color: accent }}><span aria-hidden="true" className="text-sm font-bold">@</span><span className="text-xs font-medium">Threads</span></a>}
              {socials.tiktok && <a aria-label="TikTok" title="TikTok" href={socials.tiktok} target="_blank" rel="noreferrer" className="min-h-10 rounded-full border border-border px-3 flex items-center gap-2 hover:bg-muted" style={{ color: accent }}><span aria-hidden="true" className="text-sm font-bold">♪</span><span className="text-xs font-medium">TikTok</span></a>}
              {socials.facebook && <a aria-label="Facebook" title="Facebook" href={socials.facebook} target="_blank" rel="noreferrer" className="min-h-10 rounded-full border border-border px-3 flex items-center gap-2 hover:bg-muted" style={{ color: accent }}><Facebook className="w-4 h-4" /><span className="text-xs font-medium">Facebook</span></a>}
            </nav>
          )}
        </div>
        <div className="p-6 sm:p-8 bg-muted/40">
          <p className="text-[11px] uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5" style={{ color: accent }}><Clock className="w-3.5 h-3.5" />Horario</p>
          {hasSchedule ? (
            <ul className="space-y-1.5">
              {schedule.map(d => (
                <li key={d.day} className="flex justify-between gap-3 text-sm py-1 border-b border-border/60 last:border-0">
                  <span className="text-muted-foreground">{DAY_NAMES[d.day]}</span>
                  <span className="text-foreground text-right">{fmtDay(d)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Consulta con el negocio.</p>}
        </div>
      </div>
    </section>
  );
}
