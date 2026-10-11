import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function fmtDay(d) {
  if (d.closed) return "Cerrado";
  if (d.continuous) return `${d.morning_open || ""}–${d.morning_close || ""}`;
  const m = d.morning_open ? `${d.morning_open}–${d.morning_close}` : null;
  const a = d.afternoon_open ? `${d.afternoon_open}–${d.afternoon_close}` : null;
  return [m, a].filter(Boolean).join(" · ") || "Cerrado";
}

// Frutería V2 — business info card. All data comes from the Business record and
// BusinessSettings.schedule; nothing is hardcoded.
export default function FreshMarketInfo({ business, settings, branding }) {
  const color = branding.shared.primaryColor;
  const headFont = branding.storefront.typography.heading === "display" ? "font-display" : "font-heading";
  const schedule = settings?.schedule || [];
  const hasSchedule = schedule.some(d => !d.closed && (d.morning_open || d.afternoon_open));

  return (
    <section className="fresh-market-pulse px-4 mt-6">
      <div className="rounded-2xl bg-card border border-border p-4">
        <h2 className={`${headFont} font-bold text-base text-foreground mb-3`}>{business.business_name}</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          {business.address && (
            <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} /><span>{business.address}{business.city ? `, ${business.city}` : ""}</span></p>
          )}
          {business.contact_phone && (
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" style={{ color }} />{business.contact_phone}</p>
          )}
          {business.whatsapp_phone && (
            <p className="flex items-center gap-2"><MessageCircle className="w-4 h-4 shrink-0" style={{ color }} />{business.whatsapp_phone}</p>
          )}
          {hasSchedule && (
            <div className="pt-2 border-t border-border">
              <p className="flex items-center gap-2 font-medium text-foreground mb-1.5"><Clock className="w-4 h-4 shrink-0" style={{ color }} />Horario</p>
              <ul className="space-y-0.5 pl-6">
                {schedule.map(d => (
                  <li key={d.day} className="flex justify-between gap-3"><span>{DAY_NAMES[d.day]}</span><span className="text-right">{fmtDay(d)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
