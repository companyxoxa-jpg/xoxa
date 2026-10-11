import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId, isBusinessOwner, isSuperAdmin } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/business/EmptyState";
import { OrderCard } from "@/components/business/OrderCard";
import { Link } from "react-router-dom";
import { Loader2, ShoppingBag, Euro, Clock, Bike, Shield, Rocket, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { resolveBranding } from "@/lib/templates";
import { getHomeComponent } from "@/components/dashboard/homes/registry";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}
function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export default function Home() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const bid = getBusinessId(user);

  // Resolve Business first — the dashboard skin decides which Home renders,
  // and we must NOT load 50 Orders for booking-first homes (Barber/Spa) that
  // never use them. Specialized homes load only their own data.
  useEffect(() => {
    let active = true;
    if (!bid) { setLoading(false); return; }
    (async () => {
      try {
        const biz = await base44.entities.Business.get(bid);
        if (active) setBusiness(biz);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        {isSuperAdmin(user) ? (
          <>
            <Shield className="w-12 h-12 text-primary mb-4" />
            <p className="text-lg font-heading font-bold text-foreground mb-2">Super Admin</p>
            <p className="text-sm text-muted-foreground mb-6">Gestiona comercios desde el Command Center.</p>
            <Link to="/command-center" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold">
              <Shield className="w-4 h-4" />Ir a Command Center
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No tienes un negocio asociado. Contacta con el administrador.</p>
        )}
      </div>
    );
  }

  const homeSkin = resolveBranding(business).dashboard.skin;
  const HomeComponent = getHomeComponent(homeSkin);
  return <>
    {isBusinessOwner(user) && <OwnerLaunchProgress business={business} />}
    {HomeComponent ? <HomeComponent business={business} /> : <DefaultHome business={business} />}
  </>;
}

const CHECK_ROUTES = {
  identity: '/settings', contact: '/settings', settings: '/settings', owner: '/settings',
};

function routeForCheck(check, mode) {
  if (CHECK_ROUTES[check.key]) return CHECK_ROUTES[check.key];
  if (mode === 'ASSOCIATION') return check.key === 'content' ? '/association-finances' : '/association-setup';
  if (mode === 'BOOKING') return '/agenda';
  return check.key === 'content' ? '/catalog' : '/settings';
}

function OwnerLaunchProgress({ business }) {
  const [launch, setLaunch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isDemo = business.demo_key || /^rinno-demo-\d+$/i.test(business.slug || '');

  useEffect(() => {
    let active = true;
    if (isDemo) return undefined;
    base44.functions.invoke('ManageBusiness', { action: 'launch_summary', business_id: business.id })
      .then((response) => active && setLaunch(response.data))
      .catch((error) => console.error('No se pudo cargar la puesta en marcha', error));
    return () => { active = false; };
  }, [business.id, isDemo]);

  if (isDemo || !launch) return null;
  const pending = launch.checks?.filter((check) => !check.ok) || [];
  const reviewStatus = launch.review?.status || 'draft';
  async function submitReview() {
    setBusy(true); setMessage('');
    try {
      const response = await base44.functions.invoke('ManageBusiness', { action: 'submit_review', business_id: business.id });
      setLaunch((current) => ({ ...current, review: { ...current.review, status: response.data.status, submitted_at: response.data.submitted_at, notes: null } }));
      setMessage('Aplicación enviada. El equipo de RINNO realizará la revisión final.');
    } catch (error) { setMessage(error?.response?.data?.error || 'No se pudo enviar la revisión.'); }
    finally { setBusy(false); }
  }

  return <section className="mx-4 mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm md:mx-8 md:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Rocket className="h-5 w-5" /></span>
        <div>
          <h2 className="font-heading font-bold text-foreground">{launch.published_at ? 'Aplicación publicada' : 'Prepara tu aplicación'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{launch.published_at ? 'Tu aplicación de clientes ya está disponible.' : 'Completa estos pasos para que RINNO pueda publicarla.'}</p>
        </div>
      </div>
      <strong className="w-fit rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{launch.progress}%</strong>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${launch.progress}%` }} /></div>
    {!launch.published_at && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {launch.checks?.map((check) => check.ok
        ? <div key={check.key} className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{check.label}</div>
        : <Link key={check.key} to={routeForCheck(check, business.business_mode)} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-foreground transition-colors hover:bg-muted"><Circle className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="flex-1">{check.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>)}
    </div>}
    {!launch.published_at && pending.length === 0 && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Todo preparado. El equipo de RINNO ya puede realizar la revisión final y publicar tu aplicación.</p>}
    {reviewStatus === 'changes_requested' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Hay correcciones pendientes</strong><p className="mt-1 whitespace-pre-wrap">{launch.review?.notes}</p></div>}
    {reviewStatus === 'submitted' && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-800">Revisión enviada. Te avisaremos aquí cuando esté aprobada o necesite algún ajuste.</p>}
    {reviewStatus === 'approved' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Revisión aprobada. RINNO publicará tu aplicación en el siguiente paso.</p>}
    {!launch.published_at && launch.ready && ['draft','changes_requested'].includes(reviewStatus) && <button disabled={busy} onClick={submitReview} className="mt-4 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto">{busy ? 'Enviando…' : reviewStatus === 'changes_requested' ? 'He corregido todo · reenviar' : 'Enviar a revisión'}</button>}
    {message && <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p>}
  </section>;
}

// Default / freshops / butcherops Home. Loads its own Orders (the only Home
// that needs them). Extracted so the parent can dispatch before any order query.
function DefaultHome({ business }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const ords = await base44.entities.Order.filter({ business_id: business.id }, "-created_date", 50);
      setOrders(ords);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [business.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayOrders = orders.filter(o => isToday(o.created_date));
  const salesToday = todayOrders.filter(o => o.order_status === "completed").reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount = orders.filter(o => ["pending", "accepted", "preparing", "ready"].includes(o.order_status)).length;
  const deliveriesPending = orders.filter(o => o.fulfillment_type === "own_delivery" && !["completed", "cancelled", "rejected"].includes(o.order_status)).length;

  const pendingOrders = orders
    .filter(o => ["pending", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.order_status))
    .sort((a, b) => {
      if (a.order_status === "pending" && b.order_status !== "pending") return -1;
      if (a.order_status !== "pending" && b.order_status === "pending") return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-6 pb-4">
        <p className="text-muted-foreground text-sm">{getGreeting()} 👋</p>
        <h1 className="font-heading font-bold text-2xl text-foreground">{business.business_name}</h1>
      </div>

      <div className="px-4 md:px-8">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <MetricCard icon={Euro} value={formatCurrency(salesToday)} label="Ventas hoy" />
          <MetricCard icon={ShoppingBag} value={todayOrders.length} label="Pedidos" />
          <MetricCard icon={Clock} value={pendingCount} label="Pendientes" />
          <MetricCard icon={Bike} value={deliveriesPending} label="Entregas" />
        </div>
      </div>

      <div className="px-4 md:px-8 mt-8">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Pedidos pendientes</h2>
        {pendingOrders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Todavía no hay pedidos" description="Cuando llegue uno nuevo aparecerá aquí automáticamente." />
        ) : (
          <div className="space-y-3">
            {pendingOrders.slice(0, 10).map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mb-2" />
      <p className="font-heading font-bold text-base md:text-2xl text-foreground leading-none">{value}</p>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
