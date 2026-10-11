import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId, getRinnoRole, isBusinessOwner } from "@/lib/rinno";
import { resolveBranding, hasBooking } from "@/lib/templates";
import { formatCurrency } from "@/lib/format";
import { ShoppingBag, Package, Users, Settings, Calendar, AlertTriangle, ChevronRight, TrendingUp, Clock } from "lucide-react";

const STATUS_TONE = {
  pending: "bg-amber-500/15 text-amber-500",
  accepted: "bg-blue-500/15 text-blue-500",
  preparing: "bg-violet-500/15 text-violet-500",
  ready: "bg-emerald-500/15 text-emerald-500",
  out_for_delivery: "bg-cyan-500/15 text-cyan-500",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-500/15 text-rose-500 line-through",
  rejected: "bg-rose-500/15 text-rose-500 line-through",
};
const STATUS_LABEL = { pending: "Pendiente", accepted: "Aceptado", preparing: "Preparando", ready: "Listo", out_for_delivery: "En reparto", completed: "Completado", cancelled: "Cancelado", rejected: "Rechazado" };
const FULFILLMENT = { pickup: "Recogida", own_delivery: "Entrega", external_delivery: "Envío" };

function todayIn(tz) {
  try { return new Date().toLocaleDateString("sv-SE", { timeZone: tz || "Europe/Madrid" }); }
  catch { return new Date().toISOString().slice(0, 10); }
}
function isToday(dateStr, tz) { return dateStr === todayIn(tz); }

// Template Engine V2 — Retail Ops Home. Commerce-focused: greeting, today's
// KPIs (orders + sales using only existing Order fields), new/pending
// orders list, unavailable products (is_available=false), quick links. A
// launcher grid of module tiles doubles as navigation. Uses existing
// entities directly — no new backend logic.
export default function RetailHome({ business }) {
  const { user } = useAuth();
  const bid = getBusinessId(user);
  const branding = resolveBranding(business);
  const accent = (branding.dashboard.tokens && branding.dashboard.tokens.accent) || branding.shared.secondaryColor;
  const headFont = branding.dashboard.typography.heading === "display" ? "font-display" : "font-heading";
  const tz = business?.timezone || "Europe/Madrid";
  const isOwner = isBusinessOwner(user);
  const isHybrid = hasBooking(business);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!bid) return;
    setLoading(true); setError("");
    try {
      const [or, pr, cu] = await Promise.all([
        base44.entities.Order.filter({ business_id: bid }, "-created_date", 60),
        base44.entities.Product.filter({ business_id: bid }, "-created_date", 200),
        base44.entities.Customer.filter({ business_id: bid }, "-created_date", 100),
      ]);
      setOrders(or); setProducts(pr); setCustomers(cu);
    } catch (e) { setError(e.response?.data?.error || "No se pudo cargar el panel."); }
    finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { load(); }, [load]);

  const today = todayIn(tz);
  const todayOrders = orders.filter((o) => isToday(o.scheduled_date || (o.created_date || "").slice(0, 10), tz));
  const pending = orders.filter((o) => o.order_status === "pending");
  const newOrders = pending.slice(0, 6);
  const todaySales = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const unavailable = products.filter((p) => !p.is_available);
  const activeProducts = products.filter((p) => p.is_available);

  const launcher = [
    { label: "Pedidos", path: "/orders", icon: ShoppingBag, hint: `${pending.length} pendientes` },
    { label: "Catálogo", path: "/catalog", icon: Package, hint: `${activeProducts.length} activos` },
    ...(isHybrid ? [{ label: "Agenda", path: "/agenda", icon: Calendar, hint: "Citas" }] : []),
    { label: "Clientes", path: "/customers", icon: Users, hint: `${customers.length} clientes` },
    ...(isOwner ? [{ label: "Configuración", path: "/settings", icon: Settings, hint: "Ajustes" }] : []),
  ];

  const todayLabel = new Date(today + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
          <h1 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl mt-0.5`} style={{ letterSpacing: "-0.015em" }}>Panel de ventas</h1>
        </div>
        <span className="text-xs text-muted-foreground capitalize hidden sm:block">{getRinnoRole(user)?.replace(/_/g, " ")}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={ShoppingBag} value={todayOrders.length} label="Pedidos hoy" accent={accent} />
        <Kpi icon={TrendingUp} value={formatCurrency(todaySales)} label="Ventas hoy" accent={accent} small />
        <Kpi icon={Clock} value={pending.length} label="Pendientes" accent={accent} />
        <Kpi icon={Package} value={activeProducts.length} label="Productos activos" accent={accent} />
      </div>

      {/* Launcher tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {launcher.map((l) => (
          <Link key={l.path} to={l.path} className="group bg-card border border-border rounded-2xl p-4 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + "1a" }}><l.icon className="w-5 h-5" style={{ color: accent }} /></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className={`${headFont} font-semibold text-foreground mt-3`} style={{ letterSpacing: "-0.01em" }}>{l.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{l.hint}</p>
          </Link>
        ))}
      </div>

      {/* New / pending orders */}
      <section className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`${headFont} font-semibold text-foreground text-lg`}>Pedidos nuevos</h2>
          <Link to="/orders" className="text-sm font-medium hover:underline" style={{ color: accent }}>Ver todos →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p role="alert" className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-500">{error}</p>
        ) : newOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ShoppingBag className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No hay pedidos pendientes</p>
            <p className="text-xs text-muted-foreground mt-1">Cuando llegue un pedido aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {newOrders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 hover:border-foreground/20 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent + "1a" }}><ShoppingBag className="w-4 h-4" style={{ color: accent }} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.customer_name} · #{o.order_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{FULFILLMENT[o.fulfillment_type] || o.fulfillment_type} · {formatCurrency(o.total)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${STATUS_TONE[o.order_status] || "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[o.order_status] || o.order_status}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Unavailable products */}
      {unavailable.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className={`${headFont} font-semibold text-foreground text-lg`}>Productos desactivados</h2>
            <span className="text-xs text-muted-foreground">({unavailable.length})</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {unavailable.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: accent + "12" }}>
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{p.name}</p><p className="text-xs text-muted-foreground">Agotado / inactivo</p></div>
                <Link to="/catalog" className="text-xs font-medium hover:underline" style={{ color: accent }}>Activar</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, value, label, accent, small }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5">
      <Icon className="w-4 h-4 mb-2" style={{ color: accent }} />
      <p className={`font-heading font-semibold text-foreground leading-none ${small ? "text-lg" : "text-2xl"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}