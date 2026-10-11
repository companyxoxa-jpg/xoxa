import { MapPin, Phone, MessageCircle } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function fmtDay(d) {
  if (d.closed) return "Cerrado";
  if (d.continuous) return `${d.morning_open || ""}–${d.morning_close || ""}`;
  const m = d.morning_open ? `${d.morning_open}–${d.morning_close}` : null;
  const a = d.afternoon_open ? `${d.afternoon_open}–${d.afternoon_close}` : null;
  return [m, a].filter(Boolean).join(" · ") || "Cerrado";
}

// Carnicería V2 — commerce info as a horizontal "ficha" band (3 columns on
// desktop, stacked on mobile), not a single card like Frutería.
export default function ButcherInfo({ business, settings, branding }) {
  const color = branding.shared.primaryColor;
  const accent = (branding.storefront.tokens && branding.storefront.tokens.accent) || branding.shared.secondaryColor;
  const schedule = settings?.schedule || [];
  const hasSchedule = schedule.some(d => !d.closed && (d.morning_open || d.afternoon_open));

  return (
    <section className="butcher-house-note px-4 mt-8">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: accent }}>El establecimiento</h3>
            <p className="text-sm font-semibold text-foreground">{business.business_name}</p>
            {business.address && <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} /><span>{business.address}{business.city ? `, ${business.city}` : ""}</span></p>}
            <div className="mt-2 space-y-1">
              {business.contact_phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3.5 h-3.5 shrink-0" style={{ color }} />{business.contact_phone}</p>}
              {business.whatsapp_phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color }} />{business.whatsapp_phone}</p>}
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: accent }}>Horario</h3>
            {hasSchedule ? (
              <ul className="space-y-0.5 text-xs">
                {schedule.map(d => (
                  <li key={d.day} className="flex justify-between gap-3"><span className="text-muted-foreground">{DAY_NAMES[d.day]}</span><span className="text-foreground text-right">{fmtDay(d)}</span></li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">Consulta con el comercio.</p>}
          </div>
          <div className="p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: accent }}>Nuestra selección</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{settings?.store_description || business.tagline || "Cortes seleccionados y el oficio de toda la vida."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
