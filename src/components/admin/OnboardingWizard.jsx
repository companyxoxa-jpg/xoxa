import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSuperAdmin } from "@/lib/rinno";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Check, ArrowRight, ArrowLeft, Store, Palette, Settings, CreditCard, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeBillingMonthlyPrice } from "@/lib/billingPlan";
import { TEMPLATES } from "../../../base44/shared/templates.js";
import { elixirInitialBookingSetup, elixirInitialClosures } from "@/lib/elixir-onboarding";

const BUSINESS_TYPES = [
  { value: "fruit_store", label: "Frutería" },
  { value: "butcher", label: "Carnicería" },
  { value: "fishmonger", label: "Pescadería" },
  { value: "bakery", label: "Panadería" },
  { value: "florist", label: "Floristería" },
  { value: "barber", label: "Barbería" },
  { value: "grocery", label: "Alimentación" },
  { value: "association", label: "Asociación / club social" },
  { value: "other", label: "Otro" },
];

function generateSlug(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const STEPS = [
  { num: 1, label: "Entidad", icon: Store },
  { num: 2, label: "Identidad", icon: Palette },
  { num: 3, label: "Operación", icon: Settings },
  { num: 4, label: "Plan", icon: CreditCard },
  { num: 5, label: "Propietario", icon: User },
  { num: 6, label: "Crear", icon: CheckCircle },
];

function formatCurrency(cents) { return `${(cents / 100).toFixed(2).replace(".", ",")} €`; }

const LEAD_TYPE_MAP = { 'Frutería':'fruit_store','Carnicería':'butcher','Barbería':'barber','Centro de belleza':'beauty','Comercio':'other','Social Club':'association','Otro':'other' };

export default function OnboardingWizard({ plans, onClose, onCreated, initialData=null, generatePaymentLink=false }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canGrantCourtesy = isSuperAdmin(user);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const initialType=LEAD_TYPE_MAP[initialData?.business_type]||"fruit_store";
  const defaultTemplate=initialData?.template_id||TEMPLATES.find(t=>t.sector===initialType)?.id||'retail-store';
  const [form, setForm] = useState({
    business_name: initialData?.business_name||"", business_type: initialType,
    contact_email: initialData?.email||"", contact_phone: initialData?.phone||"", whatsapp_phone: initialData?.phone||"",
    address: "", city: "", province: "", postal_code: "",
    slug: initialData?.business_name?generateSlug(initialData.business_name):"", slugTouched: false,
    primary_color: "#16A34A", secondary_color: "#0284C7", logo: "",
    pickup_enabled: true, own_delivery_enabled: false,
    delivery_fee: "", minimum_order: "",
    plan: plans.find(p=>p.active&&p.name!=="DEMO")?.name||"Business",
    owner_first_name: initialData?.name||"", owner_email: initialData?.email||"", template_id:defaultTemplate,
    minimum_age: 18, default_monthly_limit_grams: 60,
    membership_plan_name: "Membresía anual", membership_fee: "36",
    billing_exempt: false, exemption_reason: "",
    instagram: "", threads: "", tiktok: "",
  });

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function setBusinessType(value) { const mode=value==='association'?'ASSOCIATION':['barber','beauty','hair_salon'].includes(value)?'BOOKING':'COMMERCE'; setForm(prev=>({...prev,business_type:value,template_id:TEMPLATES.find(t=>t.sector===value)?.id||TEMPLATES.find(t=>t.mode===mode)?.id||'retail-store',...(value==='barber'?{primary_color:'#090909',secondary_color:'#e7ba32'}:{})})); }

  function next() {
    if (step === 1) {
      if (!form.business_name || !form.contact_email) {
        toast({ title: "Campos obligatorios", description: "Nombre y email son obligatorios.", variant: "destructive" });
        return;
      }
      if (!form.slugTouched) set("slug", generateSlug(form.business_name));
    }
    if (step === 5 && (!form.owner_first_name || !form.owner_email)) {
      toast({ title: "Campos obligatorios", description: "Nombre y email del propietario son obligatorios.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(6, s + 1));
  }
  function back() { setStep(s => Math.max(1, s - 1)); }

  async function handleCreate() {
    setCreating(true);
    try {
      const elixirSetup = elixirInitialBookingSetup(form.business_name, form.business_type);
      const isElixir = Boolean(elixirSetup);
      const payload = {
        business: {
          business_name: form.business_name,
          business_type: form.business_type,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          whatsapp_phone: form.whatsapp_phone || form.contact_phone,
          address: form.address, city: form.city, province: form.province, postal_code: form.postal_code,
        },
        identity: {
          slug: form.slug || generateSlug(form.business_name),
          primary_color: form.primary_color, secondary_color: form.secondary_color,
          template_id: form.template_id,
          logo: form.logo.trim() || (isElixir ? '/assets/brands/elixir-barber/logo.jpeg' : ''),
          ...(isElixir ? { cover_image: '/assets/brands/elixir-barber/cover.webp', headline: 'El estilo tiene nombre propio.', tagline: 'Corte, barba y cuidado en Fuengirola.' } : {}),
        },
        operation: {
          pickup_enabled: form.pickup_enabled,
          own_delivery_enabled: form.own_delivery_enabled,
          delivery_fee: form.delivery_fee ? Number(form.delivery_fee.replace(",", ".")) : 0,
          minimum_order: form.minimum_order ? Number(form.minimum_order.replace(",", ".")) : 0,
          ...(form.business_type === 'barber' ? { schedule: Array.from({length:7}, (_, day) => day === 0 ? { day, closed: true, continuous: true } : { day, closed: false, continuous: true, morning_open: '10:00', morning_close: '21:00' }) } : {}),
          ...(form.business_type === 'barber' ? { social_links: isElixir ? {
            instagram: form.instagram.trim() || 'https://www.instagram.com/elixir_barber/',
            threads: form.threads.trim() || 'https://www.threads.com/@elixir_barber?xmt=AQG0eACi6iU2iX1kcQaZLlEn3p6tJ2rBcZtVC91xAirBU50',
            tiktok: form.tiktok.trim() || 'https://www.tiktok.com/@elixirbarber.fuengirola',
          } : { instagram: form.instagram.trim(), threads: form.threads.trim(), tiktok: form.tiktok.trim() } } : {}),
          ...(isElixir ? { booking_closed_dates: elixirInitialClosures, booking_setup: elixirSetup } : {}),
        },
        association: form.business_type === "association" ? {
          minimum_age: Number(form.minimum_age),
          default_monthly_limit_grams: Number(form.default_monthly_limit_grams),
          membership_plan_name: form.membership_plan_name,
          membership_fee: Number(String(form.membership_fee).replace(",", ".")),
        } : null,
        plan: form.plan,
        billing_exempt: canGrantCourtesy && form.billing_exempt,
        ...(canGrantCourtesy && form.billing_exempt ? { exemption_reason: form.exemption_reason } : {}),
        owner: { first_name: form.owner_first_name, email: form.owner_email },
        lead_id: initialData?.id || null,
      };
      const res = await base44.functions.invoke("OnboardBusiness", payload);
      let payment_url=null,payment_error=null;
      if(generatePaymentLink && !res.data.billing_exempt){try{const checkout=await base44.functions.invoke('CreateBillingCheckout',{business_id:res.data.business.id});payment_url=checkout.data.url}catch(error){payment_error=error?.response?.data?.error||'El enlace se podrá generar desde la solicitud.'}}
      toast({ title: res.data.billing_exempt?"Alta de cortesía creada":payment_url?"Alta lista para cobrar":payment_error?"Alta creada; pago pendiente":"Negocio creado", description: res.data.billing_exempt?"Sin alta ni cuotas; el negocio no generará pagos Stripe.":payment_url?"El enlace seguro de Stripe ya está preparado.":payment_error||(res.data.message || "Negocio creado correctamente."),variant:payment_error?'destructive':undefined });
      onCreated({...res.data,payment_url});
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No pudimos crear el negocio.", variant: "destructive" });
    } finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg text-foreground">Nuevo negocio</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
          </div>
          {/* Steps indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => s.num < step && setStep(s.num)} className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                  step === s.num ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground" : s.num < step ? "text-primary cursor-pointer" : "text-muted-foreground"
                )}>
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={cn("h-px flex-1 mx-1", s.num < step ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <Field label="Nombre comercial *"><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Frutas Paco" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo *">
                  <Select value={form.business_type} onValueChange={setBusinessType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Email contacto *"><Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="hola@frutaspaco.es" /></Field>
              </div>
              <Field label="Logo (URL HTTPS o recurso local de marca)"><Input value={form.logo} onChange={e=>set("logo",e.target.value)} placeholder="/assets/brands/mi-negocio/logo.jpeg" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono"><Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="600 123 456" /></Field>
                <Field label="WhatsApp"><Input value={form.whatsapp_phone} onChange={e => set("whatsapp_phone", e.target.value)} placeholder="600 123 456" /></Field>
              </div>
              <Field label="Dirección"><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle Mayor 10" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ciudad"><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Madrid" /></Field>
                <Field label="Provincia"><Input value={form.province} onChange={e => set("province", e.target.value)} placeholder="Madrid" /></Field>
                <Field label="Código postal"><Input value={form.postal_code} onChange={e => set("postal_code", e.target.value)} placeholder="28001" /></Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Plantilla de cliente y establecimiento">
                <Select value={form.template_id} onValueChange={v => set("template_id", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATES.filter(t=>t.mode===(form.business_type==='association'?'ASSOCIATION':['barber','beauty','hair_salon'].includes(form.business_type)?'BOOKING':'COMMERCE')).map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">La plantilla incluye las dos vistas coordinadas: cliente y establecimiento.</p>
              </Field>
              <Field label="Slug (URL de la tienda)">
                <Input value={form.slug} onChange={e => { set("slug", e.target.value); set("slugTouched", true); }} placeholder="frutas-paco" />
                <p className="text-xs text-muted-foreground mt-1">La tienda estará en /store/{form.slug || "slug"}</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color principal">
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="flex-1" />
                  </div>
                </Field>
                <Field label="Color secundario">
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="flex-1" />
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 3 && form.business_type !== "association" && (
            <>
              {form.business_type === "barber" ? <>
                <p className="text-sm text-muted-foreground bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">La barbería usará reservas online. El horario inicial es lunes–sábado, 10:00–21:00; domingo cerrado. Servicios, profesionales y horarios se configuran desde el panel de reservas.</p>
                <Field label="Instagram"><Input type="url" value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="https://www.instagram.com/tu-negocio/" /></Field>
                <Field label="Threads"><Input type="url" value={form.threads} onChange={e => set("threads", e.target.value)} placeholder="https://www.threads.com/@tu-negocio" /></Field>
                <Field label="TikTok"><Input type="url" value={form.tiktok} onChange={e => set("tiktok", e.target.value)} placeholder="https://www.tiktok.com/@tu-negocio" /></Field>
              </> : <>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div><p className="font-medium text-foreground text-sm">Recogida en tienda</p><p className="text-xs text-muted-foreground">El cliente recoge el pedido</p></div>
                <Switch checked={form.pickup_enabled} onCheckedChange={v => set("pickup_enabled", v)} />
              </div>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div><p className="font-medium text-foreground text-sm">Entrega a domicilio</p><p className="text-xs text-muted-foreground">Reparto propio</p></div>
                <Switch checked={form.own_delivery_enabled} onCheckedChange={v => set("own_delivery_enabled", v)} />
              </div>
              {form.own_delivery_enabled && (
                <Field label="Coste de entrega (€)"><Input type="text" inputMode="decimal" value={form.delivery_fee} onChange={e => set("delivery_fee", e.target.value)} placeholder="2,00" /></Field>
              )}
              <Field label="Pedido mínimo (€)"><Input type="text" inputMode="decimal" value={form.minimum_order} onChange={e => set("minimum_order", e.target.value)} placeholder="10,00" /></Field>
              <p className="text-xs text-muted-foreground">Los horarios y franjas se configuran automáticamente con valores razonables.</p>
              </>}
            </>
          )}

          {step === 3 && form.business_type === "association" && (
            <>
              <p className="text-sm text-muted-foreground bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">Se crearán socios, cuotas, credencial QR, actividades, club CSC, documentos, consentimientos e incidencias. Los textos legales deberán aprobarse antes de publicarlos.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Edad mínima"><Input type="number" min="18" max="99" value={form.minimum_age} onChange={e => set("minimum_age", e.target.value)} /></Field>
                <Field label="Límite mensual inicial (g)"><Input type="number" min="1" max="500" value={form.default_monthly_limit_grams} onChange={e => set("default_monthly_limit_grams", e.target.value)} /></Field>
              </div>
              <Field label="Nombre del plan inicial"><Input value={form.membership_plan_name} onChange={e => set("membership_plan_name", e.target.value)} placeholder="Membresía anual" /></Field>
              <Field label="Cuota anual inicial (€)"><Input type="text" inputMode="decimal" value={form.membership_fee} onChange={e => set("membership_fee", e.target.value)} placeholder="36,00" /></Field>
              <div className="rounded-xl border p-4 text-sm"><strong>Lista automática de puesta en marcha</strong><ul className="mt-2 space-y-1 text-muted-foreground"><li>✓ Identidad y propietario</li><li>✓ Revisión jurídica y políticas</li><li>✓ Personal y primeros socios</li><li>✓ Prueba móvil y primera copia</li></ul></div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {plans.filter(p => p.active && p.name !== "DEMO").map(p => (
                <button key={p.id} onClick={() => set("plan", p.name)} className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-colors",
                  form.plan === p.name ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading font-bold text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(normalizeBillingMonthlyPrice(p))}/mes</p>
                    </div>
                    {form.plan === p.name && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  {p.features?.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {p.features.slice(0, 3).map((f, i) => <li key={i}>✓ {f}</li>)}
                    </ul>
                  )}
                </button>
              ))}
              {canGrantCourtesy && <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Plan de cortesía</p><p className="text-xs text-muted-foreground">Acceso completo sin alta ni cuotas; bloquea el enlace de cobro Stripe.</p></div><Switch checked={form.billing_exempt} onCheckedChange={value=>set("billing_exempt",value)} /></div>{form.billing_exempt && <Field label="Motivo de la cortesía *"><Input maxLength={1000} value={form.exemption_reason} onChange={e=>set("exemption_reason",e.target.value)} placeholder="Acuerdo de cortesía autorizado" /></Field>}</div>}
            </div>
          )}

          {step === 5 && (
            <>
              <Field label="Nombre del propietario *"><Input value={form.owner_first_name} onChange={e => set("owner_first_name", e.target.value)} placeholder="Paco" /></Field>
              <Field label="Email del propietario *"><Input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="paco@frutaspaco.es" /></Field>
              <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                Se enviará una invitación al propietario. Al registrarse y entrar, su acceso al negocio se activará automáticamente.
              </p>
            </>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <SummaryRow label="Negocio" value={form.business_name} />
              <SummaryRow label="Tipo" value={BUSINESS_TYPES.find(t => t.value === form.business_type)?.label} />
              <SummaryRow label="Slug" value={`/store/${form.slug || generateSlug(form.business_name)}`} />
              <SummaryRow label="Plantilla" value={TEMPLATES.find(t=>t.id===form.template_id)?.name||form.template_id} />
              {form.business_type !== "association" && <><SummaryRow label="Recogida" value={form.pickup_enabled ? "Sí" : "No"} /><SummaryRow label="Domicilio" value={form.own_delivery_enabled ? "Sí" : "No"} /></>}
              {form.business_type === "association" && <><SummaryRow label="Edad mínima" value={`${form.minimum_age} años`} /><SummaryRow label="Límite inicial" value={`${form.default_monthly_limit_grams} g/mes`} /><SummaryRow label="Plan de socios" value={`${form.membership_plan_name} · ${form.membership_fee} €`} /></>}
              <SummaryRow label="Plan" value={form.plan} />
              {form.billing_exempt && <><SummaryRow label="Facturación" value="Cortesía · alta 0 € · cuota mensual 0 €" /><SummaryRow label="Motivo" value={form.exemption_reason || "Pendiente"} /></>}
              <SummaryRow label="Propietario" value={`${form.owner_first_name} · ${form.owner_email}`} />
              <div className="pt-2">
                <Button className="w-full" size="lg" disabled={creating} onClick={handleCreate}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {creating ? "Preparando alta..." : form.billing_exempt ? "Crear negocio de cortesía" : generatePaymentLink ? "Crear alta y enlace de pago" : "Crear negocio"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step < 6 && (
          <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-2">
            {step > 1 && <Button variant="outline" onClick={back} className="flex-1"><ArrowLeft className="w-4 h-4" />Atrás</Button>}
            <Button onClick={next} className="flex-1">Siguiente<ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{label}</Label>{children}</div>;
}
function SummaryRow({ label, value }) {
  return <div className="flex justify-between text-sm py-1.5 border-b border-border last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground text-right">{value}</span></div>;
}
