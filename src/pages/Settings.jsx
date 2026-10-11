import { useState, useEffect, useCallback, useId, cloneElement, isValidElement } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId, isBusinessOwner } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2, Store, ShoppingBag, Bike, Clock, Calendar, Palette, Monitor, Smartphone, RotateCcw } from "lucide-react";
import AppearancePreview from "@/components/admin/AppearancePreview";
import { templateFor } from "@/lib/templates";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FULFILLMENT_LABELS = { pickup: "Recogida", own_delivery: "Domicilio", external_delivery: "Externo" };

function defaultSchedule() {
  return Array.from({ length: 7 }, (_, day) => {
    if (day === 0) return { day, closed: true };
    return { day, closed: false, continuous: true, morning_open: "09:00", morning_close: "20:00", afternoon_open: "", afternoon_close: "" };
  });
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState({});
  const [settings, setSettings] = useState({});
  const [slots, setSlots] = useState([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ fulfillment_type: "pickup", day_of_week: 1, start_time: "10:00", end_time: "11:00", max_orders: 10 });
  // Display strings for money fields (euros with comma). Kept separate from the
  // persisted cents value to avoid a controlled-input feedback loop that fights
  // the user's typing. Converted to cents only on save.
  const [moneyInputs, setMoneyInputs] = useState({ minimum_order: "", delivery_fee: "", free_delivery_threshold: "" });
  const [previewDevice, setPreviewDevice] = useState("mobile");

  const bid = getBusinessId(user);
  const isOwner = isBusinessOwner(user);
  const isAssociation = business.business_mode === "ASSOCIATION";

  const loadData = useCallback(async () => {
    if (!bid) { setLoading(false); return; }
    try {
      const [biz, settingsList, sl] = await Promise.all([
        base44.entities.Business.get(bid),
        base44.entities.BusinessSettings.filter({ business_id: bid }),
        base44.entities.FulfillmentSlot.filter({ business_id: bid }, "day_of_week", 50),
      ]);
      setBusiness(biz);
      const s = settingsList[0] || {};
      setSettings({ ...s, schedule: s.schedule?.length ? s.schedule : defaultSchedule() });
      setMoneyInputs({
        minimum_order: s.minimum_order ? (s.minimum_order / 100).toFixed(2).replace(".", ",") : "",
        delivery_fee: s.delivery_fee ? (s.delivery_fee / 100).toFixed(2).replace(".", ",") : "",
        free_delivery_threshold: s.free_delivery_threshold ? (s.free_delivery_threshold / 100).toFixed(2).replace(".", ",") : "",
      });
      setSlots(sl);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { loadData(); }, [loadData]);

  function setBiz(field, value) { setBusiness(prev => ({ ...prev, [field]: value })); }
  function restoreBrand() {
    const template = templateFor(business);
    setBusiness(prev => ({ ...prev, primary_color: template.color, secondary_color: template.color, cover_image: template.image, headline: template.title, tagline: template.subtitle, logo: "" }));
    toast({ title: "Diseño original restaurado", description: "Revisa la vista previa y guarda para confirmar." });
  }
  function setSet(field, value) { setSettings(prev => ({ ...prev, [field]: value })); }
  function setScheduleDay(day, field, value) {
    setSettings(prev => ({
      ...prev,
      schedule: prev.schedule.map(d => d.day === day ? { ...d, [field]: value } : d),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const business_data = {
        business_name: business.business_name,
        contact_phone: business.contact_phone,
        whatsapp_phone: business.whatsapp_phone,
        address: business.address,
        store_description: business.store_description,
        logo: business.logo,
        primary_color: business.primary_color,
        secondary_color: business.secondary_color,
        cover_image: business.cover_image,
        headline: business.headline,
        tagline: business.tagline,
      };
      const settings_data = {
        accept_online_orders: settings.accept_online_orders,
        minimum_order: moneyInputs.minimum_order ? Math.round(parseFloat(String(moneyInputs.minimum_order).replace(",", ".")) * 100) : 0,
        min_lead_time_minutes: Number(settings.min_lead_time_minutes) || 60,
        max_future_days: Number(settings.max_future_days) || 7,
        pickup_enabled: settings.pickup_enabled,
        own_delivery_enabled: settings.own_delivery_enabled,
        delivery_fee: moneyInputs.delivery_fee ? Math.round(parseFloat(String(moneyInputs.delivery_fee).replace(",", ".")) * 100) : 0,
        free_delivery_threshold: moneyInputs.free_delivery_threshold ? Math.round(parseFloat(String(moneyInputs.free_delivery_threshold).replace(",", ".")) * 100) : 0,
        max_delivery_radius_km: settings.max_delivery_radius_km ? Number(settings.max_delivery_radius_km) : null,
        schedule: settings.schedule,
        store_description: settings.store_description,
      };
      await base44.functions.invoke('UpdateBusinessConfig', { business_data, settings_data });
      toast({ title: "Configuración guardada" });
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No pudimos guardar la configuración.", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function toggleSlot(slot) {
    try {
      await base44.functions.invoke('ManageFulfillmentSlots', { action: 'update', slot_id: slot.id, slot_data: { is_active: !slot.is_active } });
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_active: !slot.is_active } : s));
    } catch (e) { toast({ title: "Error", description: e?.response?.data?.error || "No pudimos actualizar la franja.", variant: "destructive" }); }
  }
  async function deleteSlot(slot) {
    try {
      await base44.functions.invoke('ManageFulfillmentSlots', { action: 'delete', slot_id: slot.id });
      setSlots(prev => prev.filter(s => s.id !== slot.id));
    } catch (e) { toast({ title: "Error", description: e?.response?.data?.error || "No pudimos eliminar la franja.", variant: "destructive" }); }
  }
  async function addSlot() {
    try {
      const res = await base44.functions.invoke('ManageFulfillmentSlots', { action: 'create', slot_data: { ...newSlot, is_active: true } });
      setSlots(prev => [...prev, res.data.slot]);
      setShowSlotForm(false);
      toast({ title: "Franja añadida" });
    } catch (e) { toast({ title: "Error", description: e?.response?.data?.error || "No pudimos crear la franja.", variant: "destructive" }); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para acceder a la configuración.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-6 pb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground">Configuración</h1>
      </div>

      <div className="px-4 md:px-8 space-y-6 max-w-2xl">
        <Section icon={Store} title={isAssociation ? "Asociación" : "Comercio"}>
          <Field label="Nombre visible"><Input value={business.business_name || ""} onChange={e => setBiz("business_name", e.target.value)} /></Field>
          <Field label="Teléfono"><Input value={business.contact_phone || ""} onChange={e => setBiz("contact_phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={business.whatsapp_phone || ""} onChange={e => setBiz("whatsapp_phone", e.target.value)} /></Field>
          <Field label="Dirección"><Input value={business.address || ""} onChange={e => setBiz("address", e.target.value)} /></Field>
          <Field label="Descripción"><Textarea value={settings.store_description || ""} onChange={e => setSet("store_description", e.target.value)} rows={2} /></Field>
        </Section>

        <Section icon={Palette} title="Marca e imagen">
          <Field label="Eslogan principal"><Input value={business.headline || ""} onChange={e => setBiz("headline", e.target.value)} placeholder="Tu club, conectado y bajo control." /></Field>
          <Field label="Texto de apoyo"><Textarea value={business.tagline || ""} onChange={e => setBiz("tagline", e.target.value)} rows={2} placeholder="Una frase breve que explique tu propuesta." /></Field>
          <Field label="Logo (URL de imagen)"><Input type="url" inputMode="url" value={business.logo || ""} onChange={e => setBiz("logo", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Portada (URL de imagen)"><Input type="url" inputMode="url" value={business.cover_image || ""} onChange={e => setBiz("cover_image", e.target.value)} placeholder="https://…" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <ColorField label="Color principal" value={business.primary_color || "#173F35"} onChange={v => setBiz("primary_color", v)} />
            <ColorField label="Color secundario" value={business.secondary_color || business.primary_color || "#173F35"} onChange={v => setBiz("secondary_color", v)} />
          </div>
          {(business.logo || business.cover_image) && <div className="grid grid-cols-2 gap-3 pt-1">
            {business.logo && <div className="rounded-xl border bg-white p-3 h-28 grid place-items-center"><img src={business.logo} alt="Vista previa del logo" className="max-h-20 max-w-full object-contain" /></div>}
            {business.cover_image && <img src={business.cover_image} alt="Vista previa de la portada" className="rounded-xl border h-28 w-full object-cover" />}
          </div>}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div><p className="text-sm font-semibold text-foreground">Vista previa en directo</p><p className="text-xs text-muted-foreground">Los cambios todavía no están publicados.</p></div>
              <div className="flex gap-1 rounded-xl bg-muted p-1">
                <button type="button" aria-label="Vista móvil" onClick={() => setPreviewDevice("mobile")} className={`p-2 rounded-lg ${previewDevice === "mobile" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><Smartphone className="w-4 h-4" /></button>
                <button type="button" aria-label="Vista escritorio" onClick={() => setPreviewDevice("desktop")} className={`p-2 rounded-lg ${previewDevice === "desktop" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}><Monitor className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3 overflow-hidden"><AppearancePreview business={business} face="storefront" device={previewDevice} /></div>
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={restoreBrand}><RotateCcw className="w-4 h-4" />Restaurar diseño original</Button>
          </div>
        </Section>

        {/* Pedidos */}
        {!isAssociation && <Section icon={ShoppingBag} title="Pedidos">
          <Toggle label="Aceptar pedidos online" checked={settings.accept_online_orders ?? true} onChange={v => setSet("accept_online_orders", v)} />
          <Field label="Pedido mínimo (€)"><Input type="text" inputMode="decimal" value={moneyInputs.minimum_order} onChange={e => setMoneyInputs(prev => ({ ...prev, minimum_order: e.target.value }))} placeholder="10,00" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Anticipación mín (min)"><Input type="number" value={settings.min_lead_time_minutes ?? 60} onChange={e => setSet("min_lead_time_minutes", e.target.value)} /></Field>
            <Field label="Días futuros máx."><Input type="number" value={settings.max_future_days ?? 7} onChange={e => setSet("max_future_days", e.target.value)} /></Field>
          </div>
        </Section>}

        {/* Entrega */}
        {!isAssociation && <Section icon={Bike} title="Entrega">
          <Toggle label="Recogida en tienda" checked={settings.pickup_enabled ?? true} onChange={v => setSet("pickup_enabled", v)} />
          <Toggle label="Entrega a domicilio" checked={settings.own_delivery_enabled ?? false} onChange={v => setSet("own_delivery_enabled", v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Coste entrega (€)"><Input type="text" inputMode="decimal" value={moneyInputs.delivery_fee} onChange={e => setMoneyInputs(prev => ({ ...prev, delivery_fee: e.target.value }))} placeholder="2,00" /></Field>
            <Field label="Gratis desde (€)"><Input type="text" inputMode="decimal" value={moneyInputs.free_delivery_threshold} onChange={e => setMoneyInputs(prev => ({ ...prev, free_delivery_threshold: e.target.value }))} placeholder="30,00" /></Field>
          </div>
          <Field label="Radio de entrega (km)"><Input type="number" value={settings.max_delivery_radius_km ?? ""} onChange={e => setSet("max_delivery_radius_km", e.target.value)} placeholder="5" /></Field>
        </Section>}

        {/* Horarios */}
        <Section icon={Clock} title="Horarios">
          <p className="text-xs text-muted-foreground mb-3">Configura el horario semanal de {isAssociation ? "la sede" : "tu comercio"}.</p>
          <div className="space-y-2">
            {(settings.schedule || defaultSchedule()).map(day => (
              <div key={day.day} className="flex flex-wrap sm:flex-nowrap items-center gap-3 py-1">
                <span className="text-sm font-medium text-foreground w-20 shrink-0">{DAYS[day.day]}</span>
                <Switch checked={!day.closed} onCheckedChange={v => setScheduleDay(day.day, "closed", !v)} />
                {!day.closed && (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 flex-1 basis-full sm:basis-auto pl-0 sm:pl-0 min-w-0">
                    <Input type="time" value={day.morning_open || ""} onChange={e => setScheduleDay(day.day, "morning_open", e.target.value)} className="w-full min-w-0" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={day.morning_close || ""} onChange={e => setScheduleDay(day.day, "morning_close", e.target.value)} className="w-full min-w-0" />
                  </div>
                )}
                {day.closed && <span className="text-xs text-muted-foreground">Cerrado</span>}
              </div>
            ))}
          </div>
        </Section>

        {/* Slots */}
        {!isAssociation && <Section icon={Calendar} title="Franjas de entrega">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Capacidad por franja horaria</p>
            <Button size="sm" variant="outline" onClick={() => setShowSlotForm(!showSlotForm)}><Plus className="w-3.5 h-3.5" />Añadir</Button>
          </div>
          {showSlotForm && (
            <div className="bg-muted rounded-xl p-3 space-y-2 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <Select value={String(newSlot.day_of_week)} onValueChange={v => setNewSlot({ ...newSlot, day_of_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={newSlot.fulfillment_type} onValueChange={v => setNewSlot({ ...newSlot, fulfillment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Recogida</SelectItem>
                    <SelectItem value="own_delivery">Domicilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="time" value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} />
                <Input type="time" value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })} />
                <Input type="number" value={newSlot.max_orders} onChange={e => setNewSlot({ ...newSlot, max_orders: Number(e.target.value) })} placeholder="Cap." />
              </div>
              <Button size="sm" className="w-full" onClick={addSlot}>Crear franja</Button>
            </div>
          )}
          <div className="space-y-2">
            {slots.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin franjas configuradas</p> : slots.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                <div className="text-sm min-w-0 flex flex-wrap">
                  <span className="font-medium text-foreground">{DAYS[s.day_of_week]}</span>
                  <span className="text-muted-foreground ml-2">{s.start_time}–{s.end_time}</span>
                  <span className="text-xs text-muted-foreground ml-2">{FULFILLMENT_LABELS[s.fulfillment_type]} · {s.max_orders} ped.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.is_active} onCheckedChange={() => toggleSlot(s)} />
                  <button onClick={() => deleteSlot(s)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            ))}
          </div>
        </Section>}

        <Button className="w-full" size="lg" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar configuración
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><h2 className="font-heading font-semibold text-foreground">{title}</h2></div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children, { id: children.props.id || id }) : children;
  return <div className="space-y-1.5"><Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>{control}</div>;
}
function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return <Field label={label}><div className="flex items-center gap-2 min-w-0"><input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-10 w-12 shrink-0 rounded-lg border bg-transparent p-1"/><Input value={value} onChange={e => onChange(e.target.value)} maxLength={7} className="min-w-0 font-mono uppercase" /></div></Field>;
}
