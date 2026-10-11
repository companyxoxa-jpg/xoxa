import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getBusinessTypeLabel, formatCurrency } from "@/lib/format";
import { getBusinessDisplayName, getDemoNumber, isDemoBusiness } from "@/lib/demoBusiness";
import { normalizeBillingMonthlyPrice } from "@/lib/billingPlan";
import { Shield, Store, Building2, ArrowLeft, Loader2, Plus, UserPlus, Users, Ban, ContactRound, BadgeEuro, Link2, Copy, Check, FilePlus2, Files, FolderLock, UserRound, BarChart3, Archive, RotateCcw, Pencil, FileCheck2, Activity, TrendingUp, CalendarDays, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const CommercialCenter=lazy(()=>import('@/pages/CommercialCenter'));
const OnboardingWizard=lazy(()=>import('@/components/admin/OnboardingWizard'));
const SalesLeadsPanel=lazy(()=>import('@/components/admin/SalesLeadsPanel'));
const ContractCenter=lazy(()=>import('@/components/admin/ContractCenter'));
const DocumentationCenter=lazy(()=>import('@/components/admin/DocumentationCenter'));
const ClientDossierCenter=lazy(()=>import('@/components/admin/ClientDossierCenter'));

const statusColors = {
  onboarding: "bg-slate-500/15 text-foreground/80",
  trial: "bg-amber-500/15 text-amber-400",
  active: "bg-emerald-500/15 text-emerald-400",
  suspended: "bg-rose-500/15 text-rose-400",
  cancelled: "bg-slate-500/15 text-muted-foreground",
};
const statusLabels = { onboarding: "Configuración", trial: "Prueba", active: "Activo", suspended: "Suspendido", cancelled: "Cancelado" };
const reviewLabels = { draft: "Configurando", submitted: "Por revisar", changes_requested: "Con correcciones", approved: "Aprobada", published: "Publicada" };
const reviewColors = { draft: "bg-slate-400/10 text-slate-300", submitted: "bg-cyan-400/15 text-cyan-200", changes_requested: "bg-amber-400/15 text-amber-200", approved: "bg-emerald-400/15 text-emerald-200", published: "bg-blue-400/15 text-blue-200" };
const demoTypeLabels = { "08": "Frutería", "09": "Carnicería", "10": "Barbería", "11": "Belleza y spa", "12": "Comercio", "13": "Asociación" };

const navItems = [
  { id: "dashboard", label: "Información detallada", icon: BarChart3 },
  { id: "businesses", label: "Negocios", icon: Building2 },
  { id: "clients", label: "Clientes", icon: UserRound },
  { id: "billing", label: "Cobro de alta nueva", icon: BadgeEuro },
  { id: "contract-form", label: "Formulario de alta", icon: FilePlus2 },
  { id: "contracts", label: "Contratos", icon: Files },
  { id: "documentation", label: "Documentación", icon: FolderLock },
  { id: "commercials", label: "Comerciales", icon: Users },
  { id: "leads", label: "Solicitudes", icon: ContactRound },
];

function MetricCard({ label, value, accent = "", sublabel = "" }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", accent || "text-white")}>{value}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function BusinessTable({ businesses, demo = false, onArchive = null, onRestore = null }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_150px] gap-3 px-4 py-3 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Negocio</span><span>Tipo</span><span>{demo ? "Uso" : "Plan"}</span><span>Estado</span><span>Acciones</span>
      </div>
      <div className="divide-y divide-white/5">
        {businesses.map((b) => (
          <div key={b.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_150px] gap-3 px-4 py-3 items-center hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: b.primary_color || "#16A34A" }}><Store className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{getBusinessDisplayName(b)}</p>
                <p className="text-xs text-muted-foreground truncate">{demo ? `Demo ${getDemoNumber(b)} · ${b.slug}` : `${b.city || "Uso interno"} · ${b.slug}`}</p>
              </div>
            </div>
            <span className="text-sm text-foreground/80 hidden md:block">{demo ? demoTypeLabels[getDemoNumber(b)] : getBusinessTypeLabel(b.business_type)}</span>
            <span className="text-sm text-foreground/80 hidden md:block">{demo ? "Catálogo" : (b.subscription_status || "Interno")}</span>
            <span><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${demo ? statusColors.active : (reviewColors[b.launch_review_status || (b.published_at ? 'published' : 'draft')] || statusColors[b.status] || statusColors.onboarding)}`}>{demo ? "Publicada" : (reviewLabels[b.launch_review_status || (b.published_at ? 'published' : 'draft')] || statusLabels[b.status] || b.status)}</span></span>
            <div className="flex gap-2"><Link aria-label={`Editar ${getBusinessDisplayName(b)}`} to={`/command-center/businesses/${b.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white hover:bg-white/10"><Pencil className="h-3.5 w-3.5"/>Editar</Link>{b.archived_at?<button onClick={()=>onRestore?.(b)} className="inline-flex h-9 items-center rounded-lg border border-emerald-300/20 px-2 text-emerald-200" aria-label={`Restaurar ${getBusinessDisplayName(b)}`}><RotateCcw className="h-4 w-4"/></button>:<button onClick={()=>onArchive?.(b)} className="inline-flex h-9 items-center rounded-lg border border-rose-300/20 px-2 text-rose-200" aria-label={`Eliminar ${getBusinessDisplayName(b)}`}><Archive className="h-4 w-4"/></button>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { commandRole } = useOutletContext();
  if (commandRole === 'commercial') return <Suspense fallback={<SectionLoader/>}><CommercialCenter /></Suspense>;
  return <Suspense fallback={<SectionLoader/>}><SuperAdminCommandCenter /></Suspense>;
}

function SectionLoader(){return <div className="grid min-h-[40vh] place-items-center text-white"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" aria-label="Cargando sección"/></div>}

function SuperAdminCommandCenter() {
  const [section, setSection] = useState("dashboard");
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [billing, setBilling] = useState(null);
  const [opsMetrics, setOpsMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [businessAction,setBusinessAction]=useState(null);
  const [businessConfirmation,setBusinessConfirmation]=useState('');
  const [businessActionError,setBusinessActionError]=useState('');
  const [businessActionBusy,setBusinessActionBusy]=useState(false);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [businessFilter, setBusinessFilter] = useState("all");

  const loadData = useCallback(async () => {
    const [biz, pl, ords, subs, billingResult, operationsResult] = await Promise.all([
      base44.entities.Business.list("-created_date", 200),
      base44.entities.Plan.list(),
      base44.entities.Order.list("-created_date", 200),
      base44.entities.Subscription.list("-created_date", 200),
      base44.functions.invoke('ManageBilling',{action:'metrics'}),
      base44.functions.invoke('ManageClientDossier',{action:'metrics'}),
    ]);
    setBusinesses(biz);
    setPlans(pl);
    setOrders(ords);
    setSubscriptions(subs);
    setBilling(billingResult.data.metrics);
    setOpsMetrics(operationsResult.data.metrics);
  }, []);

  useEffect(() => {
    async function init() {
      try { await loadData(); } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    init();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--rinno-nav))]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // === Metrics ===
  const demoBusinesses = businesses.filter(isDemoBusiness).sort((a, b) => getDemoNumber(a).localeCompare(getDemoNumber(b), undefined, { numeric: true }));
  const operatingBusinesses = businesses.filter(b => !isDemoBusiness(b) && !b.archived_at);
  const archivedBusinesses = businesses.filter(b => !!b.archived_at);
  const operatingBusinessIds = new Set(operatingBusinesses.map(b => b.id));
  const activeCount = operatingBusinesses.filter(b => b.status === "active").length;
  const trialCount = operatingBusinesses.filter(b => b.status === "trial").length;
  const suspendedCount = operatingBusinesses.filter(b => b.status === "suspended").length;
  const reviewCount = operatingBusinesses.filter(b => b.launch_review_status === "submitted").length;
  const filteredOperatingBusinesses = businessFilter === "all" ? operatingBusinesses : operatingBusinesses.filter(b => (b.launch_review_status || (b.published_at ? "published" : "draft")) === businessFilter);

  // MRR: sum of active/trial subscriptions × plan monthly_price (NOT activeCount × fixed price)
  const mrr = subscriptions
    .filter(s => operatingBusinessIds.has(s.business_id) && (s.status === "active" || s.status === "trial"))
    .reduce((sum, s) => {
      const plan = plans.find(p => p.id === s.plan_id);
      return sum + normalizeBillingMonthlyPrice(plan);
    }, 0);

  // Monthly metrics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = orders.filter(o => operatingBusinessIds.has(o.business_id) && new Date(o.created_date) >= monthStart);
  const gmvMonth = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const monthBusinesses = operatingBusinesses.filter(b => new Date(b.created_date) >= monthStart);
  async function archiveBusiness(b,restore=false){
    setBusinessConfirmation('');setBusinessActionError('');setBusinessAction({business:b,restore});
  }
  async function confirmBusinessAction(){
    if(!businessAction||businessConfirmation!==businessAction.business.business_name){setBusinessActionError('Escribe el nombre exactamente para continuar.');return}
    setBusinessActionBusy(true);setBusinessActionError('');
    try{await base44.functions.invoke('ManageBusiness',{action:businessAction.restore?'restore':'archive',business_id:businessAction.business.id,confirm_name:businessConfirmation});await loadData();setBusinessAction(null);setBusinessConfirmation('')}
    catch(e){setBusinessActionError(e?.response?.data?.error||'No se pudo actualizar el negocio.')}
    finally{setBusinessActionBusy(false)}
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--rinno-nav))] flex">
      {/* Dark sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-black/30 border-r border-white/10 fixed left-0 top-0 bottom-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-white leading-none">RINNO</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Command Center</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)} className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              section === item.id ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}>
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <Link to="/demos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Ver demos
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-black/40 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-white">Command Center</span>
        </Link>
        <Link to="/demos" className="text-muted-foreground text-sm">Ver demos</Link>
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-[240px] pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 space-y-6">
          {/* Mobile nav */}
          <div className="md:hidden flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap",
                section === item.id ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground" : "bg-white/5 text-muted-foreground"
              )}>
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          {(section === "dashboard" || section === "businesses") && (
            <>
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h1 className="font-heading font-bold text-xl text-white">
                    {section === "dashboard" ? "Información detallada" : "Gestión de negocios"}
                  </h1>{section==='businesses'&&<div className="flex flex-wrap gap-2"><a href="/demos" className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white">Ver demos</a>
                  <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all">
                    <Plus className="w-4 h-4" />
                    Nuevo negocio
                  </button></div>}
                </div>

                {section==='businesses'&&<><div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <MetricCard label="Negocios reales" value={operatingBusinesses.length} sublabel="Sin contar demos" />
                  <MetricCard label="Demos publicadas" value={demoBusinesses.length} accent="text-cyan-400" />
                  <MetricCard label="Activos" value={activeCount} accent="text-emerald-400" />
                  <MetricCard label="En prueba" value={trialCount} accent="text-amber-400" />
                  <MetricCard label="Suspendidos" value={suspendedCount} accent="text-rose-400" />
                  <MetricCard label="Por revisar" value={reviewCount} accent="text-cyan-300" />
                </div>

                {/* Revenue & volume — clearly separated */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                  <MetricCard label="MRR RINNO" value={formatCurrency(billing?.mrr_cents ?? mrr)} accent="text-emerald-400" sublabel="Ingreso recurrente" />
                  <MetricCard label="GMV comercios (mes)" value={formatCurrency(gmvMonth)} accent="text-cyan-400" sublabel="Volumen de ventas" />
                  <MetricCard label="Pedidos del mes" value={monthOrders.length} />
                  <MetricCard label="Altas del mes" value={monthBusinesses.length} />
                </div></>}
                {section === "dashboard" && <DetailedInformation data={opsMetrics} billing={billing}/>} 
              </div>

              {/* Businesses table */}
              {section === "businesses" && (
                <div>
                  <h2 className="font-heading font-bold text-base text-white mb-1">Negocios operativos ({operatingBusinesses.length})</h2>
                  <p className="text-xs text-muted-foreground mb-3">Clientes y registros internos, separados del catálogo de demostración.</p>
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{[['all','Todos'],['submitted','Por revisar'],['changes_requested','Correcciones'],['approved','Aprobados'],['draft','Configurando'],['published','Publicados']].map(([value,label])=><button key={value} onClick={()=>setBusinessFilter(value)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${businessFilter===value?'bg-primary text-primary-foreground':'bg-white/5 text-white/60'}`}>{label}{value==='submitted'?` (${reviewCount})`:''}</button>)}</div>
                  <BusinessTable businesses={filteredOperatingBusinesses} onArchive={archiveBusiness} />
                  {filteredOperatingBusinesses.length===0&&<p className="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-sm text-muted-foreground">No hay negocios en este estado.</p>}
                  <h2 className="font-heading font-bold text-base text-white mt-7 mb-1">Demos publicadas ({demoBusinesses.length})</h2>
                  <p className="text-xs text-muted-foreground mb-3">Los seis modelos que aparecen en el catálogo público, ordenados por número.</p>
                  <BusinessTable businesses={demoBusinesses} demo onArchive={archiveBusiness} />
                  {archivedBusinesses.length>0&&<><h2 className="font-heading font-bold text-base text-white mt-7 mb-1">Retirados ({archivedBusinesses.length})</h2><p className="text-xs text-muted-foreground mb-3">Ocultos de la operativa, conservados para trazabilidad y recuperación.</p><BusinessTable businesses={archivedBusinesses} onRestore={b=>archiveBusiness(b,true)}/></>}
                </div>
              )}
            </>
          )}

          {section === "plans" && (
            <div>
              <h2 className="font-heading font-bold text-base text-white mb-3">Planes RINNO</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="font-heading font-bold text-lg text-white mb-1">{p.name}</h3>
                    <p className="text-2xl font-heading font-bold text-emerald-400 mb-3">{formatCurrency(normalizeBillingMonthlyPrice(p))}<span className="text-sm text-muted-foreground font-normal">/mes</span></p>
                    <div className="space-y-1.5 text-sm text-foreground/80">
                      <p>Setup: {formatCurrency(p.setup_price)}</p>
                      <p>Productos: {p.max_products === 0 ? "Ilimitados" : p.max_products}</p>
                      <p>Usuarios: {p.max_users === 0 ? "Ilimitados" : p.max_users}</p>
                    </div>
                    {p.features && p.features.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {p.features.map((f, i) => {
                          const soon = f.startsWith("Próximamente");
                          return (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className={soon ? "text-amber-400" : "text-emerald-400"}>{soon ? "◷" : "✓"}</span>
                              <span className={soon ? "text-amber-400/80" : ""}>{f}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "billing" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-heading font-bold text-xl text-white">Cobro de alta nueva</h2><p className="text-sm text-muted-foreground mt-1">Genera o recupera un enlace seguro de Stripe para cerrar la venta en el momento.</p></div><Button onClick={()=>setShowWizard(true)} className="min-h-11"><Plus className="h-4 w-4"/>Alta rápida y cobro</Button></div>
              {createdPayment?.url&&<div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5"><p className="font-bold text-emerald-100">Alta preparada y enlace listo</p><p className="mt-1 text-sm text-emerald-100/65">{createdPayment.name}. Stripe vinculará el pago automáticamente al expediente; no tendrás que escribir ni validar una referencia manual.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={createdPayment.url} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white"/><Button onClick={async()=>navigator.clipboard.writeText(createdPayment.url)} className="bg-emerald-300 text-emerald-950 hover:bg-emerald-200"><Copy className="h-4 w-4"/>Copiar enlace</Button></div></div>}
              <BillingCollectionPanel businesses={operatingBusinesses} subscriptions={subscriptions}/>
              <div><h3 className="font-heading font-bold text-lg text-white">Métricas privadas</h3><p className="text-sm text-muted-foreground mt-1">Solo visibles para Super Admin.</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard label="MRR" value={formatCurrency(billing?.mrr_cents||0)} accent="text-emerald-400"/>
                <MetricCard label="Cobrado" value={formatCurrency(billing?.collected_cents||0)} accent="text-cyan-300"/>
                <MetricCard label="Suscripciones activas" value={billing?.active_subscriptions||0}/>
                <MetricCard label="Primer mes incluido" value={billing?.trialing||0} accent="text-amber-300"/>
                <MetricCard label="Impagos" value={billing?.past_due||0} accent="text-rose-400"/>
                <MetricCard label="Pagos fallidos" value={billing?.failed_payments||0} accent="text-rose-300"/>
                <MetricCard label="Cancelaciones programadas" value={billing?.scheduled_cancellations||0}/>
                <MetricCard label="Negocios facturados" value={billing?.paying_businesses||0}/>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground"><strong className="text-white">Condiciones vigentes:</strong> alta 399 € · primer mes incluido · renovación 24,95 €/mes desde el día 30 · IVA incluido · sin permanencia.</div>
            </section>
          )}

          {section === "commercials" && <CommercialManagement />}
          {section === "leads" && <SalesLeadsPanel admin plans={plans} />}
          {section === "contract-form" && <ContractCenter admin initialView="form" />}
          {section === "contracts" && <ContractCenter admin />}
          {section === "documentation" && <DocumentationCenter />}
          {section === "clients" && <ClientDossierCenter />}
        </div>
      </main>

      {/* Onboarding wizard */}
      {showWizard && (
        <OnboardingWizard plans={plans} generatePaymentLink onClose={() => setShowWizard(false)} onCreated={(result) => { setShowWizard(false); if(result?.payment_url){setCreatedPayment({url:result.payment_url,name:result.business?.business_name||'Nuevo cliente'});setSection('billing')} loadData(); }} />
      )}
      <AlertDialog open={!!businessAction} onOpenChange={open=>{if(!open&&!businessActionBusy){setBusinessAction(null);setBusinessConfirmation('');setBusinessActionError('')}}}>
        <AlertDialogContent className="border-white/10 bg-[#0b1720] text-white">
          <AlertDialogHeader><AlertDialogTitle>{businessAction?.restore?'Restaurar negocio':'Retirar negocio'}</AlertDialogTitle><AlertDialogDescription className="leading-6 text-white/60">{businessAction?.restore?'El negocio volverá al panel operativo.':'El negocio se ocultará de la operativa, conservando su historial para poder recuperarlo.'} Escribe <strong className="text-white">{businessAction?.business?.business_name}</strong> para confirmar.</AlertDialogDescription></AlertDialogHeader>
          <label className="text-sm text-white/70">Nombre exacto<input autoFocus value={businessConfirmation} onChange={e=>setBusinessConfirmation(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none focus:border-cyan-300"/></label>
          {businessActionError&&<p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{businessActionError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={businessActionBusy} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Cancelar</AlertDialogCancel><Button disabled={businessActionBusy||businessConfirmation!==businessAction?.business?.business_name} onClick={confirmBusinessAction} className={businessAction?.restore?'bg-emerald-300 text-emerald-950 hover:bg-emerald-200':'bg-rose-300 text-rose-950 hover:bg-rose-200'}>{businessActionBusy?<Loader2 className="h-4 w-4 animate-spin"/>:businessAction?.restore?<RotateCcw className="h-4 w-4"/>:<Archive className="h-4 w-4"/>}{businessAction?.restore?'Restaurar':'Retirar del panel'}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailedInformation({data,billing}){
  if(!data)return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">Preparando el informe operativo…</div>;
  const euro=c=>formatCurrency(Number(c||0));
  const groups=[
    {title:'Negocios y altas',icon:Building2,items:[['Negocios operativos',data.businesses.total],['Activos',data.businesses.active],['En configuración',data.businesses.onboarding],['Suspendidos',data.businesses.suspended],['Altas de hoy',data.businesses.created_today],['Altas del mes',data.businesses.created_month],['Retirados',data.businesses.archived]]},
    {title:'Contratos y documentación',icon:FileCheck2,items:[['Contratos totales',data.contracts.total],['Firmados',data.contracts.signed],['Pendientes de firma',data.contracts.drafts],['Firmados hoy',data.contracts.signed_today],['Firmados este mes',data.contracts.signed_month],['Documentos firmados',data.documents.signed],['Documentos pendientes',data.documents.pending]]},
    {title:'Actividad comercial',icon:TrendingUp,items:[['Solicitudes totales',data.sales.requests],['Nuevas solicitudes',data.sales.new],['Interesados',data.sales.interested],['Cierres',data.sales.closed],['Comerciales activos',data.sales.commercials_active],['MRR RINNO',euro(billing?.mrr_cents)],['Suscripciones activas',billing?.active_subscriptions||0]]},
    {title:'Cierres y bajas',icon:CalendarDays,items:[['Cierre de hoy',euro(data.billing.collected_today)],['Cierre mensual',euro(data.billing.collected_month)],['Pagos fallidos',data.billing.failed],['Suscripciones impagadas',data.billing.past_due],['Bajas registradas',data.billing.cancellations],['Cancelaciones programadas',billing?.scheduled_cancellations||0],['Clientes facturados',billing?.paying_businesses||0]]}
  ];
  return <div className="space-y-5"><div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 to-transparent p-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Informe de dirección · solo lectura</p><p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">Estado consolidado de registros, altas, contratos, actividad comercial, cobros y bajas. Se actualiza con la información real del sistema y no permite modificar datos desde esta pantalla.</p><p className="mt-3 text-xs text-white/35">Actualizado: {new Date(data.generated_at).toLocaleString('es-ES')}</p></div><div className="grid gap-4 xl:grid-cols-2">{groups.map(({title,icon:Icon,items})=><article key={title} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"><div className="flex items-center gap-3 border-b border-white/10 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon className="h-5 w-5"/></span><h2 className="font-heading text-base font-bold text-white">{title}</h2></div><dl className="grid grid-cols-2">{items.map(([label,value],i)=><div key={label} className={`p-4 ${i%2===0?'border-r border-white/5':''} border-b border-white/5`}><dt className="text-xs text-white/40">{label}</dt><dd className="mt-1 text-xl font-bold text-white">{value===0?'0':value||'—'}</dd></div>)}</dl></article>)}</div><article className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300"/><h2 className="font-bold text-white">Últimos movimientos del sistema</h2></div><div className="divide-y divide-white/5">{data.recent_activity.map(x=><div key={x.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_150px_170px]"><span className="text-white/80">{x.action}</span><span className="text-white/45">{x.entity_type||'Sistema'}</span><span className="text-white/35 sm:text-right">{new Date(x.created_date).toLocaleString('es-ES')}</span></div>)}{!data.recent_activity.length&&<p className="py-5 text-sm text-white/40">Todavía no hay movimientos registrados.</p>}</div></article></div>;
}

function BillingCollectionPanel({businesses,subscriptions}){
  const[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(false);
  const billable=businesses.filter(b=>{const sub=subscriptions.find(s=>s.business_id===b.id);return !sub||['pending','cancelled'].includes(sub.status)}).filter(b=>`${b.business_name} ${b.contact_email||''}`.toLowerCase().includes(query.toLowerCase()));
  async function generate(){if(!selected)return;setBusy(true);setError('');try{const result=await base44.functions.invoke('CreateBillingCheckout',{business_id:selected});setUrl(result.data.url)}catch(e){setError(e?.response?.data?.error||'No se pudo generar el enlace.')}finally{setBusy(false)}}
  async function copy(){await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"><div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar negocio o email" className="bg-black/20 border-white/10 text-white"/><select value={selected} onChange={e=>{setSelected(e.target.value);setUrl('');setError('')}} className="h-10 rounded-md border border-white/10 bg-[#0a151d] px-3 text-sm text-white"><option value="">Selecciona un alta validada</option>{billable.map(b=><option value={b.id} key={b.id}>{b.business_name} · {b.contact_email||'sin email'}</option>)}</select><Button onClick={generate} disabled={!selected||busy}><Link2 className="h-4 w-4"/>{busy?'Generando…':'Generar enlace'}</Button></div>{error&&<p className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{url&&<div className="flex flex-col gap-2 rounded-xl bg-emerald-400/10 p-4 sm:flex-row"><input readOnly value={url} className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white"/><Button onClick={copy} className="bg-emerald-300 text-emerald-950 hover:bg-emerald-200">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}{copied?'Copiado':'Copiar'}</Button></div>}<p className="text-xs text-muted-foreground">Solo aparecen negocios sin una suscripción activa. El servidor vuelve a validar todos los datos antes de crear el enlace.</p></div>
}

function CommercialManagement(){
  const {toast}=useToast(); const[email,setEmail]=useState(''),[items,setItems]=useState([]),[busy,setBusy]=useState(false),[removeTarget,setRemoveTarget]=useState(null),[removeError,setRemoveError]=useState('');
  const load=useCallback(()=>base44.functions.invoke('ManageCommercial',{action:'list'}).then(r=>setItems(r.data.commercials||[])),[]);
  useEffect(()=>{load()},[load]);
  async function invite(e){e.preventDefault();setBusy(true);try{await base44.functions.invoke('ManageCommercial',{action:'invite',email});toast({title:'Invitación enviada',description:`${email} tendrá acceso solo al área comercial y demos.`});setEmail('');await load()}catch(err){toast({title:'Error',description:err?.response?.data?.error||'No se pudo invitar.',variant:'destructive'})}finally{setBusy(false)}}
  async function revoke(email){setBusy(true);try{await base44.functions.invoke('ManageCommercial',{action:'revoke',email});await load()}finally{setBusy(false)}}
  async function remove(){if(!removeTarget)return;setBusy(true);setRemoveError('');try{await base44.functions.invoke('ManageCommercial',{action:'remove',email:removeTarget});await load();setRemoveTarget(null)}catch(err){setRemoveError(err?.response?.data?.error||'No se pudo eliminar el acceso comercial.')}finally{setBusy(false)}}
  return <section className="space-y-5"><div><h1 className="font-heading font-bold text-xl text-white">Equipo comercial</h1><p className="text-sm text-muted-foreground mt-1">Controla accesos, carga asignada y cierres. Los permisos financieros, métricas privadas y expedientes de clientes permanecen bloqueados por servidor.</p></div><form onSubmit={invite} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-3"><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="comercial@empresa.com" className="bg-black/20 border-white/10 text-white"/><Button disabled={busy}><UserPlus className="w-4 h-4"/>{busy?'Enviando…':'Invitar comercial'}</Button></form><div className="grid gap-4 lg:grid-cols-2">{items.length===0?<p className="rounded-xl border border-dashed border-white/15 p-8 text-sm text-muted-foreground">Todavía no hay comerciales invitados.</p>:items.map(x=><article key={x.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10"><UserRound className="h-5 w-5 text-cyan-300"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{x.email}</p><p className={`mt-1 text-xs ${x.status==='active'?'text-emerald-300':'text-rose-300'}`}>{x.status==='active'?'Acceso activo':'Acceso revocado'}</p></div><div className="flex gap-2">{x.status==='active'&&<button disabled={busy} onClick={()=>revoke(x.email)} aria-label={`Revocar ${x.email}`} className="grid h-9 w-9 place-items-center rounded-lg border border-amber-300/20 text-amber-200"><Ban className="h-4 w-4"/></button>}<button disabled={busy} onClick={()=>{setRemoveError('');setRemoveTarget(x.email)}} aria-label={`Eliminar ${x.email}`} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-300/20 text-rose-200"><Trash2 className="h-4 w-4"/></button></div></div><div className="mt-4 grid grid-cols-2 gap-2"><MetricCard label="Solicitudes asignadas" value={x.assigned_leads||0}/><MetricCard label="Cierres" value={x.closed_leads||0} accent="text-emerald-300"/></div><div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-widest text-white/35">Permisos concedidos</p><div className="mt-2 flex flex-wrap gap-2">{(x.permissions||[]).map(p=><span key={p} className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60">{p}</span>)}</div><p className="mt-3 text-[11px] text-rose-200/70">Sin acceso a dinero, facturación, métricas privadas ni expedientes.</p></div></article>)}</div><AlertDialog open={!!removeTarget} onOpenChange={open=>{if(!open&&!busy){setRemoveTarget(null);setRemoveError('')}}}><AlertDialogContent className="border-white/10 bg-[#0b1720] text-white"><AlertDialogHeader><AlertDialogTitle>Eliminar acceso comercial</AlertDialogTitle><AlertDialogDescription className="leading-6 text-white/60">Se retirará el acceso de <strong className="text-white">{removeTarget}</strong>. Los registros históricos de sus gestiones permanecerán en el sistema.</AlertDialogDescription></AlertDialogHeader>{removeError&&<p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{removeError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Cancelar</AlertDialogCancel><button disabled={busy} onClick={remove} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-rose-300 px-4 font-bold text-rose-950 disabled:opacity-50">{busy&&<Loader2 className="h-4 w-4 animate-spin"/>}Eliminar acceso</button></AlertDialogFooter></AlertDialogContent></AlertDialog></section>
}


