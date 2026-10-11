import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, getBusinessTypeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Store, ExternalLink, LogIn, Ban, CheckCircle, QrCode, Loader2,
  Users, ShoppingBag, Euro, UserPlus, Link as LinkIcon, RefreshCw, AlertTriangle, CreditCard,
  Rocket, Eye, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeBillingMonthlyPrice } from "@/lib/billingPlan";
import TemplateAppearancePanel from "@/components/admin/TemplateAppearancePanel";
import LaunchImporter from "@/components/admin/LaunchImporter";
import DocumentationCenter from "@/components/admin/DocumentationCenter";

const statusColors = {
  onboarding: "bg-slate-500/15 text-foreground/80",
  trial: "bg-amber-500/15 text-amber-400",
  active: "bg-emerald-500/15 text-emerald-400",
  suspended: "bg-rose-500/15 text-rose-400",
  cancelled: "bg-slate-500/15 text-muted-foreground",
};

const PUBLISHED_URL = "https://rinno.es";

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enterSupportMode } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState(null);
  const [orders, setOrders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState("business_staff");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [linkingUser, setLinkingUser] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [lockReason, setLockReason] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [launch,setLaunch]=useState(null),[launchBusy,setLaunchBusy]=useState(false);
  const [reviewNotes,setReviewNotes]=useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const biz = await base44.entities.Business.get(id);
      setBusiness(biz);
      const [ords, subs, team] = await Promise.all([
        base44.entities.Order.filter({ business_id: id }, "-created_date", 200),
        base44.entities.Subscription.filter({ business_id: id }),
        base44.functions.invoke("ManageBusinessTeam", { action: "list", business_id: id }),
      ]);
      setOrders(ords);
      setSubscription(subs[0]);
      if (subs[0]?.plan_id) {
        try {
          const p = await base44.entities.Plan.get(subs[0].plan_id);
          setPlan(p);
          setSelectedPlan(p.name);
        } catch (e) {}
      } else if (biz.plan_id) {
        try {
          const p = await base44.entities.Plan.get(biz.plan_id);
          setPlan(p);
          setSelectedPlan(p.name);
        } catch (e) {}
      }
      setUsers(team.data.users || []);
      setInvitations(team.data.invitations || []);
      if(!biz.demo_key&&!/^rinno-demo-\d+$/i.test(biz.slug||'')){try{const summary=await base44.functions.invoke('ManageBusiness',{action:'launch_summary',business_id:id});setLaunch(summary.data)}catch(e){console.error(e)}}
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStatusChange(newStatus) {
    try {
      await base44.functions.invoke("ManageBusiness", { action: "change_status", business_id: id, status: newStatus });
      setBusiness(prev => ({ ...prev, status: newStatus }));
      toast({ title: "Estado actualizado", description: `${business.business_name} → ${newStatus}` });
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No se pudo actualizar.", variant: "destructive" });
    }
  }

  async function handleEnterSupport() {
    try {
      await enterSupportMode(business.id, business.business_name);
      navigate("/panel");
    } catch (e) {
      toast({ title: "Error", description: "No se pudo entrar al negocio.", variant: "destructive" });
    }
  }

  async function inspectLock() {
    setLockBusy(true);
    try { const r=await base44.functions.invoke('ManageMutationLock',{action:'inspect',business_id:id}); setLockInfo(r.data); }
    catch(e){ toast({title:'Error',description:e?.response?.data?.error||'No se pudo revisar el bloqueo.',variant:'destructive'}); }
    finally { setLockBusy(false); }
  }
  async function recoverLock() {
    setLockBusy(true);
    try { await base44.functions.invoke('ManageMutationLock',{action:'recover',business_id:id,expected_token:lockInfo.lock_token,reason:lockReason}); toast({title:'Bloqueo recuperado'}); setLockReason(''); await inspectLock(); }
    catch(e){ toast({title:'No se pudo recuperar',description:e?.response?.data?.error||'Vuelve a inspeccionar el bloqueo.',variant:'destructive'}); }
    finally { setLockBusy(false); }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await base44.functions.invoke("ManageBusinessTeam", { action: "invite", business_id: id, email: inviteEmail, rinno_role: inviteRole });
      toast({ title: "Invitación enviada", description: `${inviteEmail} quedará vinculado automáticamente cuando entre.` });
      setShowInvite(false);
      setInviteEmail("");
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: err.message || "No se pudo enviar la invitación.", variant: "destructive" });
    } finally { setInviting(false); }
  }

  async function handleLinkUser(email, role) {
    setLinkingUser(email);
    try {
      await base44.functions.invoke("LinkBusinessUser", { email, business_id: id, rinno_role: role });
      toast({ title: "Usuario vinculado", description: `${email} → ${role === "business_owner" ? "Propietario" : "Staff"}` });
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No se pudo vincular.", variant: "destructive" });
    } finally { setLinkingUser(null); }
  }

  async function handleResetDemo() {
    setResetting(true);
    try {
      const res = await base44.functions.invoke("ResetDemo", { business_id: id, confirm: "RESET" });
      toast({ title: "Demo restablecida", description: res.data.message });
      setShowReset(false);
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No se pudo restablecer.", variant: "destructive" });
    } finally { setResetting(false); }
  }

  async function handleChangePlan() {
    if (!selectedPlan || selectedPlan === plan?.name) return;
    setChangingPlan(true);
    try {
      await base44.functions.invoke("ManageBusiness", { action: "change_plan", business_id: id, plan_name: selectedPlan });
      toast({ title: "Plan actualizado", description: `${business.business_name} → ${selectedPlan}` });
      await loadData();
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No se pudo cambiar el plan.", variant: "destructive" });
    } finally { setChangingPlan(false); }
  }

  async function publishBusiness(){setLaunchBusy(true);try{await base44.functions.invoke('ManageBusiness',{action:'publish',business_id:id});toast({title:'Negocio publicado',description:'La aplicación de clientes ya está disponible.'});await loadData()}catch(e){toast({title:'Aún no se puede publicar',description:e?.response?.data?.error||'Revisa los requisitos pendientes.',variant:'destructive'})}finally{setLaunchBusy(false)}}
  async function reviewBusiness(action){setLaunchBusy(true);try{await base44.functions.invoke('ManageBusiness',{action,business_id:id,notes:reviewNotes});toast({title:action==='approve_review'?'Revisión aprobada':'Correcciones enviadas al propietario'});setReviewNotes('');await loadData()}catch(e){toast({title:'No se pudo actualizar la revisión',description:e?.response?.data?.error||'Inténtalo de nuevo.',variant:'destructive'})}finally{setLaunchBusy(false)}}

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--rinno-nav))]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  if (!business) return (
    <div className="min-h-screen bg-[hsl(var(--rinno-nav))] flex flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground mb-4">Negocio no encontrado.</p>
      <Link to="/command-center"><Button variant="outline">Volver</Button></Link>
    </div>
  );

  const storeUrl = `${PUBLISHED_URL}/store/${business.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(storeUrl)}`;
  const gmv = orders.reduce((s, o) => s + (o.total || 0), 0);
  const owner = users.find(u => u.rinno_role === "business_owner");
  const staff = users.filter(u => u.rinno_role === "business_staff");
  const pendingInvitations = invitations.filter(invitation => invitation.status === "pending");
  const isDemo = business.slug === "rinno-fresh";

  return (
    <div className="min-h-screen bg-[hsl(var(--rinno-nav))]">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/10 px-4 md:px-8 py-4 flex items-center gap-3">
        <Link to="/command-center" className="p-2 -ml-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-xl text-white truncate">{business.business_name}</h1>
          <p className="text-xs text-muted-foreground">{business.slug} · {getBusinessTypeLabel(business.business_type)}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", statusColors[business.status])}>{business.status}</span>
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-4xl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={Euro} label="GMV total" value={formatCurrency(gmv)} />
          <SummaryCard icon={ShoppingBag} label="Pedidos" value={orders.length} />
          <SummaryCard icon={Users} label="Usuarios" value={users.length} />
          <SummaryCard icon={Store} label="Plan" value={plan?.name || "—"} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
              <ExternalLink className="w-4 h-4" />Abrir tienda
            </Button>
          </a>
          <Button onClick={handleEnterSupport}>
            <LogIn className="w-4 h-4" />Entrar al negocio
          </Button>
          {(business.status === "active" || business.status === "trial") && (
            <Button variant="outline" onClick={() => handleStatusChange("suspended")} className="bg-white/5 border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
              <Ban className="w-4 h-4" />Suspender
            </Button>
          )}
          {business.status === "suspended" && (
            <Button variant="outline" onClick={() => handleStatusChange("active")} className="bg-white/5 border-white/10 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
              <CheckCircle className="w-4 h-4" />Activar
            </Button>
          )}
        </div>

        {launch&&<div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Rocket className="h-5 w-5 text-cyan-300"/><h2 className="font-heading font-semibold text-white">Puesta en marcha</h2></div><p className="mt-1 text-sm text-muted-foreground">La tienda permanece privada hasta completar los requisitos y publicarla.</p></div><span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-bold text-cyan-200">{launch.progress}% preparado</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" style={{width:`${launch.progress}%`}}/></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{launch.checks?.map(check=><div key={check.key} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${check.ok?'border-emerald-400/20 bg-emerald-400/10 text-emerald-200':'border-white/10 bg-black/15 text-white/55'}`}>{check.ok?<CheckCircle className="h-4 w-4 shrink-0"/>:<Circle className="h-4 w-4 shrink-0"/>}{check.label}</div>)}</div>{!business.published_at&&<div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/40">Revisión final</p><p className="mt-2 text-sm text-white/70">Estado: <strong className="text-white">{launch.review?.status==='submitted'?'Esperando revisión':launch.review?.status==='changes_requested'?'Correcciones solicitadas':launch.review?.status==='approved'?'Aprobada':'Pendiente del propietario'}</strong></p>{launch.review?.notes&&<p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">{launch.review.notes}</p>}{launch.review?.status==='submitted'&&<div className="mt-3 space-y-2"><Textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} maxLength={2000} placeholder="Indica las correcciones necesarias si no está preparada" className="border-white/10 bg-white/5 text-white"/><div className="grid gap-2 sm:grid-cols-2"><Button disabled={launchBusy||reviewNotes.trim().length<5} variant="outline" onClick={()=>reviewBusiness('request_changes')} className="border-amber-400/20 bg-amber-400/10 text-amber-200">Solicitar correcciones</Button><Button disabled={launchBusy||!launch.ready} onClick={()=>reviewBusiness('approve_review')}><CheckCircle className="h-4 w-4"/>Aprobar revisión</Button></div></div>}</div>}{business.published_at&&<div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-bold uppercase tracking-wider text-white/40">Seguimiento tras el lanzamiento</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{launch.milestones?.map(item=><div key={item.key} className={`flex items-center gap-2 rounded-xl p-3 text-sm ${item.ok?'bg-emerald-400/10 text-emerald-200':'bg-white/5 text-white/45'}`}>{item.ok?<CheckCircle className="h-4 w-4"/>:<Circle className="h-4 w-4"/>}{item.label}</div>)}</div></div>}<div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={handleEnterSupport} variant="outline" className="border-white/10 bg-white/5 text-white"><Eye className="h-4 w-4"/>Revisar establecimiento</Button>{business.published_at?<a href={storeUrl} target="_blank" rel="noreferrer"><Button className="w-full"><ExternalLink className="h-4 w-4"/>Abrir aplicación cliente</Button></a>:<Button disabled={!launch.ready||launchBusy||launch.review?.status!=='approved'} onClick={publishBusiness}><Rocket className="h-4 w-4"/>{launchBusy?'Publicando…':'Publicar negocio'}</Button>}</div>{!launch.ready&&<p className="mt-3 text-xs text-amber-300/80">Completa los puntos pendientes desde “Entrar al negocio” o desde los apartados de apariencia y usuarios.</p>}</div>}

        {!isDemo&&<LaunchImporter business={business} onImported={loadData}/>} 

        {/* Subscription / Plan */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-white">Suscripción</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Plan actual</p>
              <p className="text-sm font-semibold text-white">{plan?.name || "—"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Mensualidad</p>
              <p className="text-sm font-semibold text-emerald-400">{plan ? formatCurrency(normalizeBillingMonthlyPrice(plan)) : "—"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Puesta en marcha</p>
              <p className="text-sm font-semibold text-amber-400">{plan ? formatCurrency(plan.setup_price) : "—"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Estado suscripción</p>
              <p className="text-sm font-semibold text-white capitalize">{subscription?.status || business.subscription_status || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-foreground/80">
            <p>Productos: <span className="font-medium text-white">{plan ? (plan.max_products === 0 ? "Ilimitados" : plan.max_products) : "—"}</span></p>
            <p>Usuarios: <span className="font-medium text-white">{plan ? (plan.max_users === 0 ? "Ilimitados" : plan.max_users) : "—"}</span></p>
          </div>
          <p className="text-[11px] text-emerald-300/80 mb-4">Límites aplicados automáticamente por el servidor según el plan contratado.</p>
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2">Cambiar plan (Super Admin)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedPlan}
                onChange={e => setSelectedPlan(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                <option value="Standard">Standard · 24,95 €/mes</option>
                <option value="Premium">Premium · 39,99 €/mes</option>
                <option value="DEMO">DEMO / INTERNAL · 0 € (interno)</option>
              </select>
              <Button
                onClick={handleChangePlan}
                disabled={changingPlan || !selectedPlan || selectedPlan === plan?.name}
                className="sm:w-auto"
              >
                {changingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {changingPlan ? "Guardando..." : "Aplicar plan"}
              </Button>
            </div>
          </div>
        </div>

        {/* Apariencia — Super Admin appearance editor (Template Engine V2) */}
        <TemplateAppearancePanel key={business.id} business={business} onSaved={loadData} />

        {/* QR Code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-white">QR de la tienda</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-xl shrink-0">
              <img src={qrUrl} alt="QR" className="w-32 h-32" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/80 mb-1">Escanea para abrir la tienda:</p>
              <p className="text-sm text-primary font-mono break-all mb-3">{storeUrl}</p>
              <a href={qrUrl} download={`qr-${business.slug}.png`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <QrCode className="w-3.5 h-3.5" />Descargar QR
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-semibold text-white">Usuarios</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowInvite(!showInvite)} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <UserPlus className="w-3.5 h-3.5" />Invitar
            </Button>
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="bg-black/20 rounded-xl p-3 space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <select className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="business_staff">Staff</option>
                  <option value="business_owner">Propietario</option>
                </select>
                <Input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/70" />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setShowInvite(false)} className="bg-transparent border-white/10 text-muted-foreground">Cancelar</Button>
                <Button type="submit" size="sm" disabled={inviting}>{inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviar invitación"}</Button>
              </div>
            </form>
          )}

          {/* Owner */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Propietario</p>
            {owner ? (
              <UserRow user={owner} role="Propietario" />
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm text-amber-300">Propietario invitado · Se activará automáticamente al entrar</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleLinkUser(business.contact_email, "business_owner")} disabled={linkingUser === business.contact_email} className="bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20">
                  {linkingUser === business.contact_email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}Vincular
                </Button>
              </div>
            )}
          </div>

          {/* Staff */}
          {staff.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Staff</p>
              {staff.map(u => <UserRow key={u.id} user={u} role="Staff" />)}
            </div>
          )}
          {pendingInvitations.filter(invitation => invitation.rinno_role === "business_staff").length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Invitaciones pendientes</p>
              {pendingInvitations.filter(invitation => invitation.rinno_role === "business_staff").map(invitation => (
                <div key={invitation.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-200 truncate">{invitation.email}</p>
                  <p className="text-xs text-amber-300/70">El acceso se activará automáticamente al entrar</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400"/><h2 className="font-heading font-semibold text-white">Bloqueo operativo</h2></div>
          <p className="text-sm text-muted-foreground mt-2">Diagnóstico seguro para operaciones interrumpidas. La recuperación siempre queda auditada.</p>
          <Button variant="outline" disabled={lockBusy} onClick={inspectLock} className="mt-4 bg-transparent border-white/10 text-white">{lockBusy?<Loader2 className="animate-spin"/>:<RefreshCw className="w-4 h-4"/>}Inspeccionar</Button>
          {lockInfo&&<div className="mt-4 rounded-xl bg-black/20 p-4"><p className="text-sm text-white">{lockInfo.locked?'Bloqueado':'Sin bloqueo'}</p>{lockInfo.locked&&<><p className="text-xs text-muted-foreground mt-1">Inicio: {new Date(lockInfo.started_at).toLocaleString('es-ES')}</p><Input className="mt-3 bg-black/20 border-white/10 text-white" placeholder="Motivo de recuperación (mínimo 10 caracteres)" value={lockReason} onChange={e=>setLockReason(e.target.value)}/><Button disabled={!lockInfo.can_recover||lockReason.trim().length<10||lockBusy} onClick={recoverLock} className="mt-2 bg-amber-500 text-black">Recuperar bloqueo</Button>{!lockInfo.can_recover&&<p className="text-xs text-amber-300 mt-2">Todavía puede pertenecer a una operación activa.</p>}</>}</div>}
        </div>

        {!isDemo && <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><DocumentationCenter businessId={business.id}/></div>}

        {/* Demo Reset (only for RINNO Fresh) */}
        {isDemo && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-rose-400" />
              <h2 className="font-heading font-semibold text-white">Restablecer demo</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Elimina pedidos, items y resetea métricas de clientes. No afecta productos, configuración ni usuarios.</p>
            {showReset ? (
              <div className="space-y-3">
                <p className="text-sm text-rose-300">¿Confirmar? Se eliminarán {orders.length} pedidos de forma permanente.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReset(false)} className="bg-transparent border-white/10 text-muted-foreground">Cancelar</Button>
                  <Button onClick={handleResetDemo} disabled={resetting} className="bg-rose-500 text-white hover:bg-rose-600">
                    {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Restablecer demo
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowReset(true)} className="bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20">
                <RefreshCw className="w-4 h-4" />Restablecer demo RINNO Fresh
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <p className="font-heading font-bold text-xl text-white leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function UserRow({ user, role }) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <span className="text-sm font-medium text-primary">{(user.full_name || user.email || "?")[0].toUpperCase()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{role}</span>
    </div>
  );
}
