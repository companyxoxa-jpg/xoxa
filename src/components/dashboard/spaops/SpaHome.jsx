import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { resolveBranding, modeFor } from "@/lib/templates";
import { formatCurrency } from "@/lib/format";
import { Calendar, Users, Sparkles, Clock, ShoppingBag, Package, Settings, ChevronRight } from "lucide-react";

const STATE_LABELS = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", no_show: "No_show", cancelled: "Cancelada" };
const STATUS_TONE = {
  pending: "bg-amber-500/15 text-amber-500",
  confirmed: "bg-emerald-500/15 text-emerald-500",
  completed: "bg-muted text-muted-foreground",
  no_show: "bg-rose-500/15 text-rose-500",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function todayIn(tz) {
  try { return new Date().toLocaleDateString("sv-SE", { timeZone: tz || "Europe/Madrid" }); }
  catch { return new Date().toISOString().slice(0, 10); }
}

// Template Engine V2 — Spa agenda-first Home. Calm & visual: centered
// greeting, soft stats, today's appointments as cards with an accent left
// border (distinct from BarberHome's colored time-block column). Reuses
// ManageBooking 'list' and the Customer entity — no new backend logic.
export default function SpaHome({ business }) {
  const { user } = useAuth();
  const bid = getBusinessId(user);
  const branding = resolveBranding(business);
  const accent = (branding.dashboard.tokens && branding.dashboard.tokens.accent) || branding.shared.secondaryColor;
  const headFont = branding.dashboard.typography.heading === "editorial" ? "font-editorial" : branding.dashboard.typography.heading === "display" ? "font-display" : "font-heading";
  const tz = business?.timezone || "Europe/Madrid";
  const isHybrid = modeFor(business) === "HYBRID";

  const [date, setDate] = useState(todayIn(tz));
  const [data, setData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!bid) return;
    setLoading(true); setError("");
    try {
      const [agenda, custs] = await Promise.all([
        base44.functions.invoke("ManageBooking", { action: "list", date }),
        base44.entities.Customer.filter({ business_id: bid }, "-created_date", 200),
      ]);
      setData(agenda.data);
      setCustomers(custs);
    } catch (e) { setError(e.response?.data?.error || "No se pudo cargar la agenda."); }
    finally { setLoading(false); }
  }, [bid, date]);

  useEffect(() => { load(); }, [load]);

  const appointments = (data?.appointments || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
  const pending = appointments.filter(a => a.status === "pending");
  const todayLabel = new Date(date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  function quickLinks() {
    const links = [
      { label: "Agenda", path: "/agenda", icon: Calendar, desc: "Citas y equipo" },
      { label: "Clientes", path: "/customers", icon: Users, desc: `${customers.length} clientes` },
    ];
    if (isHybrid) {
      links.push({ label: "Pedidos", path: "/orders", icon: ShoppingBag, desc: "Comercio" });
      links.push({ label: "Productos", path: "/catalog", icon: Package, desc: "Catálogo" });
    }
    links.push({ label: "Configuración", path: "/settings", icon: Settings, desc: "Ajustes" });
    return links;
  }

  return (
    <div className="px-5 md:px-10 pt-8 pb-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Panel</p>
        <h1 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl`} style={{ letterSpacing: "-0.015em" }}>{business?.business_name}</h1>
        <p className="text-sm text-muted-foreground mt-1.5 capitalize">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Sparkles} value={data?.services?.length ?? 0} label="Servicios" accent={accent} />
        <Stat icon={Users} value={data?.professionals?.length ?? 0} label="Profesionales" accent={accent} />
        <Stat icon={Calendar} value={appointments.length} label="Citas hoy" accent={accent} />
        <Stat icon={Clock} value={pending.length} label="Pendientes" accent={accent} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${headFont} font-semibold text-foreground text-lg`}>Citas de hoy</h2>
          <Link to="/agenda" className="text-sm font-medium hover:underline" style={{ color: accent }}>Ver agenda →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p role="alert" className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-500">{error}</p>
        ) : appointments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No hay citas hoy</p>
            <p className="text-xs text-muted-foreground mt-1">Un día para preparar el espacio.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(a => (
              <article key={a.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4" style={{ borderLeft: `3px solid ${accent}` }}>
                <div className="text-center shrink-0 min-w-[52px]">
                  <p className={`${headFont} font-semibold text-foreground text-base leading-none`}>{a.start_time}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{a.end_time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{a.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.customer_name} · con {a.professional_name} · {formatCurrency(a.price)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${STATUS_TONE[a.status] || "bg-muted text-muted-foreground"}`}>{STATE_LABELS[a.status] || a.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid sm:grid-cols-2 gap-5">
        <div>
          <h2 className={`${headFont} font-semibold text-foreground text-lg mb-3`}>Por confirmar</h2>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Todo en orden.</p> : (
            <div className="space-y-2">
              {pending.map(a => (
                <Link key={a.id} to="/agenda" className="flex items-center gap-2 text-sm text-foreground hover:underline">
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />{a.start_time} · {a.customer_name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className={`${headFont} font-semibold text-foreground text-lg mb-3`}>Accesos</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks().map(l => (
              <Link key={l.path} to={l.path} className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:border-foreground/20 transition-colors">
                <l.icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
                <span className="min-w-0"><span className="block text-sm font-medium text-foreground truncate">{l.label}</span><span className="block text-[10px] text-muted-foreground truncate">{l.desc}</span></span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label, accent }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
      <Icon className="w-4 h-4 mx-auto mb-2" style={{ color: accent }} />
      <p className="font-heading font-semibold text-2xl text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}