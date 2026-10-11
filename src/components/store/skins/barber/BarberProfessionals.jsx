import { Image } from "@/components/ui/image";
import { ArrowRight } from "lucide-react";

// Barbería V2 — professionals. A horizontal scroller of portrait cards on
// mobile, a 2-3 column grid on desktop. Each card shows photo, name and
// specialty, with a "Reservar con" action that scrolls to the booking flow
// (and pre-selects the professional when a service is already chosen and the
// professional serves it).
export default function BarberProfessionals({ professionals, service, onSelect, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";

  if (!professionals?.length) return null;
  const eligible = service ? professionals.filter(p => p.service_ids?.includes(service.id)) : professionals;

  function handlePick(p) {
    if (service && p.service_ids?.includes(service.id)) onSelect(p);
  }

  return (
    <section id="profesionales" className="px-4 sm:px-6 mt-10">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.28em] mb-1.5" style={{ color: accent }}>Equipo</p>
        <h2 className={`${headFont} font-bold text-foreground text-2xl sm:text-3xl leading-tight`}>Nuestros barberos</h2>
      </div>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0" style={{ scrollbarWidth: "none" }}>
        {eligible.map(p => (
          <button key={p.id} onClick={() => handlePick(p)} className="shrink-0 w-[68vw] sm:w-auto text-left bg-card rounded-2xl overflow-hidden border border-border hover:border-foreground/20 transition-colors">
            <div className="h-44 sm:h-40 w-full overflow-hidden" style={{ backgroundColor: branding.shared.primaryColor + "14" }}>
              {p.photo ? <Image src={p.photo} alt={p.name} fittingType="fill" className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center font-editorial text-4xl text-muted-foreground">{p.name?.[0] || "?"}</div>}
            </div>
            <div className="p-4">
              <h3 className={`${headFont} font-bold text-foreground text-lg leading-tight`}>{p.name}</h3>
              {p.specialty && <p className="text-sm text-muted-foreground mt-0.5">{p.specialty}</p>}
              <span className="inline-flex items-center gap-1 text-xs font-semibold mt-3" style={{ color: accent }}>Reservar con {p.name.split(" ")[0]}<ArrowRight className="w-3.5 h-3.5" /></span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}